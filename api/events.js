import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const result=await withDb(async db=>({ok:true,events:(await db.query('SELECT id,task_id,event_type,details,created_at FROM team_events ORDER BY id DESC LIMIT 100')).rows}));
 return respond(res,result.status||200,{...result,status:undefined});
}
