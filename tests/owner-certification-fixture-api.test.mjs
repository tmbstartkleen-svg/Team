import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerCertificationFixture} from '../lib/owner-certification-fixture-api.mjs';
const token='owner-token-'.repeat(4),url='https://team.example/api/owner-certification-fixture';
const taskId='cert-controlled-task-001';
const request=(body={taskId,confirm:'CREATE-UNAPPROVED-TEST-TASK'},authorization='Bearer '+token)=>new Request(url,{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify(body)});
const fixture=()=>{
 let writes=0,bindings=null;
 const env={TEAM_OWNER_API_TOKEN:token,TEAM_DB:{prepare(sql){return {bind(...args){bindings=args;return {first:async()=>{writes++;return {id:args[0],state:'queued',owner_approved:0}}}}}}}};
 return {env,getWrites:()=>writes,getBindings:()=>bindings};
};
test('anonymous clients cannot create certification tasks',async()=>{
 const f=fixture();const response=await handleOwnerCertificationFixture(request(undefined,'Bearer wrong'),f.env);
 assert.equal(response.status,401);assert.equal(f.getWrites(),0);
});
test('creation needs deliberate confirmation and certification-only ID',async()=>{
 const f=fixture();
 assert.equal((await handleOwnerCertificationFixture(request({taskId,confirm:'yes'}),f.env)).status,400);
 assert.equal((await handleOwnerCertificationFixture(request({taskId:'ordinary-task',confirm:'CREATE-UNAPPROVED-TEST-TASK'}),f.env)).status,400);
 assert.equal(f.getWrites(),0);
});
test('fixture creation fails closed while executor is enabled',async()=>{
 const f=fixture();
 assert.equal((await handleOwnerCertificationFixture(request(),{...f.env,TEAM_EXECUTOR_ENABLED:'true'})).status,503);
 assert.equal(f.getWrites(),0);
});
test('fixture creates an unapproved task only',async()=>{
 const f=fixture();const response=await handleOwnerCertificationFixture(request(),f.env);
 assert.equal(response.status,201);
 assert.deepEqual(await response.json(),{ok:true,taskId,state:'queued',ownerApproved:false,executionStarted:false,approvalRequired:true});
 assert.equal(f.getWrites(),1);
 assert.equal(f.getBindings()[0],taskId);
 assert.match(f.getBindings()[1],/Certification-only analysis/);
});
test('fixture rejects a different explicitly pinned certification task',async()=>{
 const f=fixture();const response=await handleOwnerCertificationFixture(request(),{...f.env,TEAM_EXECUTOR_CERTIFICATION_TASK_ID:'cert-other-task-00001'});
 assert.equal(response.status,403);assert.equal(f.getWrites(),0);
});
