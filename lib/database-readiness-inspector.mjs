// Read-only PostgreSQL schema and privilege inspection; never mutates data.
export async function inspectDatabaseReadiness(db){
 if(!db||typeof db.query!=='function')return {ok:false,error:'database_unavailable',status:503};
 const q=await db.query("SELECT to_regclass('public.team_tasks') IS NOT NULL AS tasks, to_regclass('public.team_events') IS NOT NULL AS events, to_regclass('public.team_projects') IS NOT NULL AS projects");
 const tables=q.rows?.[0]||{},schemaReady=Boolean(tables.tasks&&tables.events&&tables.projects);
 let readable=false,writable=false;
 if(schemaReady){
  await db.query('SELECT 1 FROM team_tasks LIMIT 0');readable=true;
  const p=await db.query("SELECT has_table_privilege(current_user,'public.team_tasks','INSERT') AS tasks_insert,has_table_privilege(current_user,'public.team_tasks','UPDATE') AS tasks_update,has_table_privilege(current_user,'public.team_events','INSERT') AS events_insert");
  writable=Boolean(p.rows?.[0]?.tasks_insert&&p.rows?.[0]?.tasks_update&&p.rows?.[0]?.events_insert);
 }
 const ok=schemaReady&&readable&&writable;
 return {ok,databaseConnected:true,schemaReady,taskQueryVerified:readable,writePrivilegesVerified:writable,tables,status:ok?200:503};
}
