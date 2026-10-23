import pg from 'pg';
import {resolveDatabaseUrl} from '../lib/database-url.mjs';
import {respond,method} from '../lib/server-auth.mjs';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 // This diagnostic is read-only and preview-only; never disclose host, database, role or secrets.
 if(process.env.VERCEL_ENV!=='preview'||process.env.TEAM_STAGING_TESTS_ENABLED!=='true')
  return respond(res,404,{ok:false,error:'not_found'});
 const url=resolveDatabaseUrl(process.env);
 if(!url)return respond(res,503,{ok:false,error:'staging_database_not_configured',productionOperational:false});
 const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:3500,query_timeout:3500});
 try{
  await client.connect();
  const result=await client.query("SELECT to_regclass('public.team_projects') IS NOT NULL AS projects,to_regclass('public.team_tasks') IS NOT NULL AS tasks,to_regclass('public.team_events') IS NOT NULL AS events");
  const tables=result.rows[0]||{};
  const schemaReady=Boolean(tables.projects&&tables.tasks&&tables.events);
  return respond(res,schemaReady?200:503,{ok:schemaReady,environment:'preview',databaseConnected:true,schemaReady,tables:{projects:Boolean(tables.projects),tasks:Boolean(tables.tasks),events:Boolean(tables.events)},writesPerformed:false,modelExecution:'disabled',productionOperational:false});
 }catch{
  return respond(res,503,{ok:false,error:'staging_database_unavailable',productionOperational:false});
 }finally{try{await client.end()}catch{}}
}
