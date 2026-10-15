import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const checked=await withDb(async db=>{
  const q=await db.query("SELECT to_regclass('public.team_tasks') IS NOT NULL AS tasks, to_regclass('public.team_events') IS NOT NULL AS events, to_regclass('public.team_projects') IS NOT NULL AS projects");
  const tables=q.rows[0]||{};
  const schemaReady=Boolean(tables.tasks&&tables.events&&tables.projects);
  let writable=false;
  if(schemaReady){const probe=await db.query('SELECT 1 FROM team_tasks LIMIT 0');writable=Boolean(probe)}
  return {ok:schemaReady&&writable,databaseConnected:true,schemaReady,taskQueryVerified:writable,tables,checkedAt:new Date().toISOString(),status:schemaReady&&writable?200:503};
 });
 return respond(res,checked.status||200,{...checked,status:undefined});
}
