import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function handler(req,res){
 if(!method(req,res,['POST']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{ok:false,error:'json_required'});
 const {taskId,confirmNoRetry}=req.body||{};
 if(!uuid.test(String(taskId||'')))return respond(res,400,{ok:false,error:'invalid_task_id'});
 if(confirmNoRetry!==true)return respond(res,403,{ok:false,error:'confirmation_required'});
 const data=await withDb(async db=>{
  const client=await db.connect();
  try{
   await client.query('BEGIN');
   const update=await client.query("UPDATE team_tasks SET status='needs_review',updated_at=now() WHERE id=$1 AND status='running' AND updated_at < now() - interval '3 minutes' RETURNING id,status",[taskId]);
   if(!update.rowCount){await client.query('ROLLBACK');return {ok:false,error:'not_stalled_or_already_resolved',status:409}}
   await client.query('INSERT INTO team_events(task_id,event_type,details) VALUES($1,$2,$3)',[taskId,'task.manual_review_requested',JSON.stringify({retryAllowed:false})]);
   await client.query('COMMIT');
   return {ok:true,task:update.rows[0],retryPerformed:false};
  }catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}
 });
 return respond(res,data.status||200,{...data,status:undefined});
}
