import test from 'node:test';
import assert from 'node:assert/strict';
import {withDb} from '../lib/database.mjs';
import tasks from '../api/tasks.js';
function fakeResponse(){let status,body;return {get statusCode(){return status},get body(){return body},setHeader(){},status(n){status=n;return this},json(data){body=data;return this}}}
test('no database configuration fails closed without executing callbacks',async()=>{
 const before=process.env.TEAM_DATABASE_URL;
 delete process.env.TEAM_DATABASE_URL;
 let called=false;
 try{
  const r=await withDb(async()=>{called=true;return {ok:true}});
  assert.equal(called,false);
  assert.deepEqual(r,{ok:false,error:'database_not_configured',status:503});
 }finally{if(before===undefined)delete process.env.TEAM_DATABASE_URL;else process.env.TEAM_DATABASE_URL=before}
});
test('authenticated task listing cannot silently use browser-local or production storage',async()=>{
 const dbBefore=process.env.TEAM_DATABASE_URL;
 const tokenBefore=process.env.TEAM_ADMIN_TOKEN;
 delete process.env.TEAM_DATABASE_URL;
 process.env.TEAM_ADMIN_TOKEN='isolated-staging-test-only';
 try{
  const response=fakeResponse();
  await tasks({method:'GET',headers:{authorization:'Bearer isolated-staging-test-only'}},response);
  assert.equal(response.statusCode,503);
  assert.equal(response.body.error,'database_not_configured');
 }finally{
  if(dbBefore===undefined)delete process.env.TEAM_DATABASE_URL;else process.env.TEAM_DATABASE_URL=dbBefore;
  if(tokenBefore===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=tokenBefore;
 }
});
