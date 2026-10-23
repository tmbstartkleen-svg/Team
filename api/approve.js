import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{ok:false,error:'json_required'});
 const {taskId,decision}=req.body||{};
 if(typeof taskId!=='string'||!uuid.test(taskId))return respond(res,400,{ok:false,error:'invalid_task_id'});
 if(!['approved','rejected'].includes(decision))return respond(res,400,{ok:false,error:'invalid_decision'});
 const result=await withDb(async db=>{
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   const approvalTimestamp=decision==='approved'?'now()':'NULL';
   const upd=await client.query(`UPDATE team_tasks SET approval=$1::varchar,approved_at=${approvalTimestamp},updated_at=now() WHERE id=$2::uuid AND approval='pending' AND status='queued' RETURNING id,approval,status`,[decision,taskId]);
   if(!upd.rowCount){await client.query('ROLLBACK');return {ok:false,error:'not_found_or_already_decided',status:409}}
   await client.query('INSERT INTO team_events(task_id,event_type,details) VALUES($1,$2,$3)',[taskId,'task.'+decision,JSON.stringify({decision})]);
   await client.query('COMMIT');
   return {ok:true,task:upd.rows[0]};
  }catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
 });
 return respond(res,result.status||200,{...result,status:undefined});
}
