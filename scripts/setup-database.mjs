// Run only against a newly provisioned dedicated TEAM database.
import pg from 'pg';
import {readFileSync} from 'node:fs';
import {checkStagingIsolation} from '../lib/staging-isolation-preflight.mjs';
const url=process.env.TEAM_DATABASE_URL;
const verifyOnly=process.argv.includes('--verify-only');
const stagingGuard=checkStagingIsolation(process.env);
// Even read-only verification must not contact an unidentified database from preview.
if(process.env.VERCEL_ENV==='preview'&&stagingGuard.safe!==true){
 console.error('Staging database access blocked: isolation preflight failed');
 process.exitCode=5;
}else if(!verifyOnly&&(process.env.TEAM_STAGING_SCHEMA_APPLY_APPROVED!=='true'||stagingGuard.safe!==true)){
 console.error('Schema application blocked: requires explicit staging-only authorization and isolation preflight');
 process.exitCode=5;
}else if(!url){console.error('TEAM_DATABASE_URL is required');process.exitCode=2}
else{
 const pool=new pg.Pool({connectionString:url,ssl:{rejectUnauthorized:true},max:1,connectionTimeoutMillis:7000});
 try{
  const existing=await pool.query("SELECT to_regclass('public.team_tasks') AS tasks");
  if(existing.rows[0]?.tasks&&!verifyOnly){console.error('Schema already exists; refusing non-idempotent setup without review');process.exitCode=3}
  else if(process.argv.includes('--verify-only')){
   const q=await pool.query("SELECT to_regclass('public.team_tasks') AS tasks,to_regclass('public.team_events') AS events,to_regclass('public.team_projects') AS projects");
   const ready=Object.values(q.rows[0]).every(Boolean);
   console.log(ready?'TEAM schema verified':'TEAM schema incomplete');
   if(!ready)process.exitCode=4;
  }else{
   const sql=readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8');
   const client=await pool.connect();
   try{await client.query('BEGIN');await client.query(sql);await client.query('COMMIT');console.log('TEAM schema initialized')}catch(e){await client.query('ROLLBACK');throw e}finally{client.release()}
  }
 }catch(e){console.error('Database setup failed:',e.code||'connection_or_schema_error');process.exitCode=1}
 finally{await pool.end()}
}
