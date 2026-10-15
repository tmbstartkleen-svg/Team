import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const checked=await withDb(async db=>{
  const q=await db.query("SELECT to_regclass('public.team_tasks') IS NOT NULL AS tasks, to_regclass('public.team_events') IS NOT NULL AS events, to_regclass('public.team_projects') IS NOT NULL AS projects");
  const tables=q.rows[0]||{};
  return {ok:Boolean(tables.tasks&&tables.events&&tables.projects),databaseConnected:true,schemaReady:Boolean(tables.tasks&&tables.events&&tables.projects),tables,checkedAt:new Date().toISOString(),status:tables.tasks&&tables.events&&tables.projects?200:503};
 });
 return respond(res,checked.status||200,{...checked,status:undefined});
}
