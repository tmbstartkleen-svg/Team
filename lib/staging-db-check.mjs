import pg from 'pg';
import {resolveDatabaseUrl} from './database-url.mjs';
// Read-only Preview probe. Returns booleans only; never exposes DB identity or credentials.
export async function checkStagingDatabase(env=process.env){
 if(env.VERCEL_ENV!=='preview'||env.TEAM_STAGING_TESTS_ENABLED!=='true')
  return {enabled:false,connected:false,schemaReady:false,writesPerformed:false};
 const url=resolveDatabaseUrl(env);
 if(!url)return {enabled:true,connected:false,schemaReady:false,writesPerformed:false,reason:'database_not_configured'};
 const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:2500,query_timeout:2500});
 try{
  await client.connect();
  const r=await client.query("SELECT to_regclass('public.team_projects') IS NOT NULL AS projects,to_regclass('public.team_tasks') IS NOT NULL AS tasks,to_regclass('public.team_events') IS NOT NULL AS events");
  const t=r.rows[0]||{};
  return {enabled:true,connected:true,schemaReady:Boolean(t.projects&&t.tasks&&t.events),tables:{projects:Boolean(t.projects),tasks:Boolean(t.tasks),events:Boolean(t.events)},writesPerformed:false};
 }catch{
  return {enabled:true,connected:false,schemaReady:false,writesPerformed:false,reason:'connection_or_schema_check_failed'};
 }finally{try{await client.end()}catch{}}
}
