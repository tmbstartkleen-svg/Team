import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const result=await withDb(async db=>{
  const rows=await db.query("SELECT id,title,persona,status,approval,updated_at FROM team_tasks WHERE status='running' AND updated_at < now() - interval '3 minutes' ORDER BY updated_at LIMIT 100");
  return {ok:true,stalled:rows.rows,count:rows.rowCount,policy:'manual-review-required'};
 });
 return respond(res,result.status||200,{...result,status:undefined});
}
