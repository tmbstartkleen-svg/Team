import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerTaskPreflight} from '../lib/owner-task-claim-api.mjs';
const token='x'.repeat(40),base='https://team.example/api/owner-task-preflight';
const request=(path='?taskId=t1',auth=true)=>new Request(base+path,{headers:auth?{authorization:'Bearer '+token}:{}});
test('anonymous preflight rejected',async()=>assert.equal((await handleOwnerTaskPreflight(request('?taskId=t1',false),{TEAM_OWNER_API_TOKEN:token})).status,401));
test('missing database and invalid task id fail closed',async()=>{
 assert.equal((await handleOwnerTaskPreflight(request(),{TEAM_OWNER_API_TOKEN:token})).status,503);
 assert.equal((await handleOwnerTaskPreflight(request('?taskId=bad%20id'),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:{prepare(){throw Error('should not query')}}})).status,400);
});
test('approved queued task reports claimability without mutation',async()=>{
 const queries=[];const db={prepare(sql){queries.push(sql);return {bind(id){assert.equal(id,'t1');return {first:async()=>({id:'t1',state:'queued',owner_approved:1,attempt_count:0,assigned_persona:'qa'})}}}}};
 const r=await handleOwnerTaskPreflight(request(),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});const j=await r.json();
 assert.equal(r.status,200);assert.equal(j.claimable,true);assert.equal(j.executionStarted,false);
 assert.equal(queries.length,1);assert.match(queries[0],/^SELECT /);
});
test('unapproved task is not claimable',async()=>{
 const db={prepare(){return {bind(){return {first:async()=>({id:'t1',state:'queued',owner_approved:0,attempt_count:0})}}}}};
 const r=await handleOwnerTaskPreflight(request(),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
 assert.equal((await r.json()).claimable,false);
});
