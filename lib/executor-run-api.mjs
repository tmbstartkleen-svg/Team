import {authorizedExecutor} from './executor-service-auth.mjs';
import {certificationWindowValid} from './certification-window.mjs';
import {executeApprovedPersonaTask} from './approved-persona-pipeline.mjs';
import {inspectExecutorSchema} from './executor-schema-readiness.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Service-to-service only. No browser token can initiate execution.
export async function handleExecutorRun(request,env,dependencies={}){
 if(!await authorizedExecutor(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 if(env.TEAM_EXECUTOR_ENABLED!=='true')return json({ok:false,error:'executor_disabled'},503);
 // Enabling the executor alone cannot authorize general task execution.
 if(env.TEAM_EXECUTOR_CERTIFICATION_MODE!=='true'&&env.TEAM_EXECUTOR_GENERAL_RELEASED!=='true')return json({ok:false,error:'release_gate_closed'},503);
 // Certification and general-release authorization are mutually exclusive.
 if(env.TEAM_EXECUTOR_CERTIFICATION_MODE==='true'&&env.TEAM_EXECUTOR_GENERAL_RELEASED==='true')return json({ok:false,error:'conflicting_release_modes'},503);
 if(env.TEAM_EXECUTOR_CERTIFICATION_MODE==='true'&&!certificationWindowValid(env))return json({ok:false,error:'certification_window_closed'},503);
 if(!env.TEAM_DB?.prepare||!env.TEAM_DB?.batch)return json({ok:false,error:'database_not_connected'},503);
 const workersAI=env.TEAM_INFERENCE_PROVIDER==='cloudflare';
 if(workersAI?!env.AI?.run:typeof env.OPENAI_API_KEY!=='string'||!env.OPENAI_API_KEY)return json({ok:false,error:'provider_not_configured'},503);
 const model=env.TEAM_EXECUTOR_MODEL;
 const allowed=String(env.TEAM_ALLOWED_MODELS||'').split(',').map(x=>x.trim()).filter(Boolean);
 if(!workersAI&&(typeof model!=='string'||!allowed.includes(model)))return json({ok:false,error:'model_not_allowlisted'},503);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json({ok:false,error:'json_required'},415);
 if(Number(request.headers.get('content-length')||0)>1024)return json({ok:false,error:'payload_too_large'},413);
 let raw;try{raw=await request.text()}catch{return json({ok:false,error:'invalid_request'},400)}
 if(raw.length>1024)return json({ok:false,error:'payload_too_large'},413);
 let input;try{input=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
 if(!input||typeof input.taskId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(input.taskId))return json({ok:false,error:'invalid_task_id'},400);
 if(env.TEAM_EXECUTOR_CERTIFICATION_MODE==='true'&&(!/^cert-[A-Za-z0-9_-]{8,120}$/.test(input.taskId)||env.TEAM_EXECUTOR_CERTIFICATION_TASK_ID!==input.taskId))return json({ok:false,error:'certification_task_only'},403);
 const schema=await inspectExecutorSchema(env.TEAM_DB);
 if(!schema.ready)return json({ok:false,error:'executor_schema_incomplete'},503);
 const run=dependencies.execute||executeApprovedPersonaTask;
 try{
  const result=await run({db:env.TEAM_DB,taskId:input.taskId,leaseToken:crypto.randomUUID()+crypto.randomUUID(),receiptId:crypto.randomUUID(),leaseUntil:new Date(Date.now()+120000).toISOString(),fetcher:dependencies.fetcher||fetch,apiKey:env.OPENAI_API_KEY,model,ai:workersAI?env.AI:null,provider:workersAI?'cloudflare':'openai'});
  if(!result.ok)return json(result,result.state==='not_claimed'?409:502);
  return json(result,200);
 }catch{return json({ok:false,error:'executor_failed'},502)}
}
