import {randomUUID} from 'node:crypto';
import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
import {SPECIALISTS} from '../lib/route.mjs';
import {modelPolicy} from '../lib/limits.mjs';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function outputText(result){return typeof result.output_text==='string'?result.output_text:(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('\n')}

export default async function handler(req,res){
 if(!method(req,res,['POST']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{ok:false,error:'json_required'});
 if(!process.env.OPENAI_API_KEY)return respond(res,503,{ok:false,error:'model_not_configured'});
 const {taskId}=req.body||{};
 if(typeof taskId!=='string'||!uuid.test(taskId))return respond(res,400,{ok:false,error:'invalid_task_id'});
 const policy=modelPolicy();
 const model=policy.model;
 if(!policy.allowed)return respond(res,503,{ok:false,error:'model_not_allowlisted'});
 const result=await withDb(async db=>{
  // Claim and initial audit event commit atomically; never start a provider call without an audit record.
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   const updated=await client.query("UPDATE team_tasks SET status='running',updated_at=now() WHERE id=$1 AND approval='approved' AND status='queued' RETURNING id,title,persona",[taskId]);
   if(!updated.rowCount){await client.query('ROLLBACK');return {ok:false,error:'not_approved_or_not_queued',status:409}}
   const task=updated.rows[0];
   if(!SPECIALISTS.some(p=>p.name===task.persona)){await client.query('ROLLBACK');return {ok:false,error:'unknown_registered_persona',status:422}}
   await client.query('INSERT INTO team_events(task_id,event_type,details) VALUES($1,$2,$3)',[taskId,'task.model_started',JSON.stringify({model})]);
   await client.query('COMMIT');
   return {ok:true,task};
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 });
 if(!result.ok)return respond(res,result.status||503,{ok:false,error:result.error});
 const task=result.task,controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),policy.timeoutMs);
 try{
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{authorization:'Bearer '+process.env.OPENAI_API_KEY,'content-type':'application/json'},body:JSON.stringify({model,max_output_tokens:policy.maxOutputTokens,store:false,instructions:'You are the '+task.persona+' specialist within ATLAS TEAM. Give analysis and proposed steps only, without claiming to have performed external actions.',input:task.title})});
  const length=Number(response.headers.get('content-length')||0);
  if(length>1000000)throw Error('provider_response_too_large');
  const reader=response.body?.getReader();
  let raw='';
  if(reader){const decoder=new TextDecoder();let bytes=0;while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1000000){await reader.cancel();throw Error('provider_response_too_large')}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}
  else{raw=await response.text();if(Buffer.byteLength(raw)>1000000)throw Error('provider_response_too_large')}
  if(!response.ok)throw Error('provider_failure');
  const data=JSON.parse(raw);
  const text=outputText(data);
  const record=await withDb(async db=>{
   const client=await db.connect();try{await client.query('BEGIN');await client.query('INSERT INTO team_events(task_id,event_type,details) VALUES($1,$2,$3)',[task.id,'task.model_completed',JSON.stringify({model,requestId:data.id||null,result:text.slice(0,12000)})]);await client.query("UPDATE team_tasks SET status='completed',updated_at=now() WHERE id=$1 AND status='running'",[task.id]);await client.query('COMMIT')}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
   return {ok:true};
  });
  if(!record.ok)return respond(res,503,{ok:false,error:'model_completed_but_history_unavailable'});
  return respond(res,200,{ok:true,taskId:task.id,status:'completed',model,result:text,requestId:data.id||randomUUID()});
 }catch{
  await withDb(async db=>{
   await db.query("UPDATE team_tasks SET status='failed',updated_at=now() WHERE id=$1 AND status='running'",[task.id]);
   await db.query('INSERT INTO team_events(task_id,event_type,details) VALUES($1,$2,$3)',[task.id,'task.model_failed',JSON.stringify({model})]);
   return {ok:true};
  });
  return respond(res,502,{ok:false,error:'model_execution_failed'});
 }finally{clearTimeout(timer)}
}
