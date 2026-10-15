import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const id=String(req.query?.id||'');
 if(!uuid.test(id))return respond(res,400,{ok:false,error:'invalid_task_id'});
 const data=await withDb(async db=>{
  const task=await db.query('SELECT id,title,persona,priority,status,approval,created_at,updated_at FROM team_tasks WHERE id=$1',[id]);
  if(!task.rowCount)return {ok:false,error:'task_not_found',status:404};
  const events=await db.query('SELECT id,event_type,details,created_at FROM team_events WHERE task_id=$1 ORDER BY id DESC LIMIT 100',[id]);
  return {ok:true,task:task.rows[0],events:events.rows};
 });
 return respond(res,data.status||200,{...data,status:undefined});
}
