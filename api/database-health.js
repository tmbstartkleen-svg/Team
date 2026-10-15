import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const checked=await withDb(async db=>{
  const q=await db.query("SELECT to_regclass('public.team_tasks') IS NOT NULL AS tasks, to_regclass('public.team_events') IS NOT NULL AS events, to_regclass('public.team_projects') IS NOT NULL AS projects");
  const tables=q.rows[0]||{};
  const schemaReady=Boolean(tables.tasks&&tables.events&&tables.projects);
  let readable=false;
  let writable=false;
  if(schemaReady){const probe=await db.query('SELECT 1 FROM team_tasks LIMIT 0');readable=Boolean(probe);
   const privileges=await db.query("SELECT has_table_privilege(current_user,'public.team_tasks','INSERT') AS tasks_insert,has_table_privilege(current_user,'public.team_tasks','UPDATE') AS tasks_update,has_table_privilege(current_user,'public.team_events','INSERT') AS events_insert");
   const p=privileges.rows[0]||{};writable=Boolean(p.tasks_insert&&p.tasks_update&&p.events_insert);
  }
  return {ok:schemaReady&&readable&&writable,databaseConnected:true,schemaReady,taskQueryVerified:readable,writePrivilegesVerified:writable,tables,checkedAt:new Date().toISOString(),status:schemaReady&&writable?200:503};
 });
 return respond(res,checked.status||200,{...checked,status:undefined});
}
