import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const cli=new URL('../scripts/check-staging-setup.mjs',import.meta.url);
const common={VERCEL_ENV:'preview',TEAM_STAGING_TESTS_ENABLED:'true',
 TEAM_DATABASE_URL:'postgresql://staging@stage.example.invalid/staging',
 TEAM_PRODUCTION_DATABASE_HOST:'prod.example.invalid',
 TEAM_STAGING_INSTANCE_ID:'atlas-staging-synthetic-check'};
function run(changes={}){
 const env={PATH:process.env.PATH,HOME:process.env.HOME,...common,...changes};
 const result=spawnSync(process.execPath,[cli.pathname],{env,encoding:'utf8',timeout:5000});
 return {status:result.status,report:JSON.parse(result.stdout),stderr:result.stderr};
}
test('preflight is connection-free and never authorizes tasks',()=>{
 const x=run();
 assert.equal(x.status,0);
 assert.equal(x.report.ok,true);
 assert.equal(x.report.connectionAttempted,false);
 assert.equal(x.report.schemaApplied,false);
 assert.equal(x.report.taskExecutionAuthorized,false);
});
test('preflight denies production and missing staging identity',()=>{
 for(const patch of [{VERCEL_ENV:'production'},{TEAM_STAGING_INSTANCE_ID:''},
  {TEAM_DATABASE_URL:'postgresql://other@prod.example.invalid/production'},
  {TEAM_STAGING_TESTS_ENABLED:'false'}]){
  const x=run(patch);
  assert.equal(x.status,2);
  assert.equal(x.report.ok,false);
  assert.equal(x.report.taskExecutionAuthorized,false);
 }
});
