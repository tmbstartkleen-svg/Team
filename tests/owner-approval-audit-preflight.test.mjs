import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerApprovalAuditPreflight} from '../lib/owner-approval-audit-preflight.mjs';
const scope={taskId:'safe-task-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123'};
function db({valid=true,rows=[{id:'audit-record-123',actor:'owner',decision:'approved',created_at:'2026-10-21 19:00:00'}]}={}){
 let reads=0;
 return {get reads(){return reads},prepare(sql){
  assert.match(sql,/^SELECT /);reads++;
  return {bind(){return {first:async()=>valid?{task_id:scope.taskId,step_id:scope.stepId,idempotency_key:scope.idempotencyKey,enabled:1,created_at:'2026-10-21 19:10:00'}:null,all:async()=>({results:rows})}}};
 }};
}
test('historical approval is only a preflight; it never authenticates owner provenance',async()=>{
 const store=db();
 const value=await createOwnerApprovalAuditPreflight(store)(scope);
 assert.equal(value.eligible,true);
 assert.equal(value.originAuthenticated,false);
 assert.ok(value.missing.includes('independent_source_signature'));
 assert.equal(store.reads,2);
});
test('ambiguous, rejected, missing, and protected tasks fail closed',async()=>{
 for(const store of [db({valid:false}),db({rows:[]}),db({rows:[{decision:'rejected',actor:'owner'}]}),
  db({rows:[{decision:'approved',actor:'owner'}, {decision:'approved',actor:'owner'}]})])
  assert.equal((await createOwnerApprovalAuditPreflight(store)(scope)).eligible,false);
 const store=db();
 for(const taskId of ['cert-github-read-20261018','cert-github-read-20261019-v2'])
  assert.deepEqual(await createOwnerApprovalAuditPreflight(store)({...scope,taskId}),{eligible:false,originAuthenticated:false});
 assert.equal(store.reads,0);
});
