import test from 'node:test';
import assert from 'node:assert/strict';
import {createExecutionAttestationReader} from '../lib/execution-attestation-reader.mjs';
const scope={requirement:'real-read-adapter',taskId:'safe-cert-100',stepId:'safe-step-100',idempotencyKey:'safe-key-100',receiptId:'safe-receipt-100'};
const db={prepare(sql){return{bind(){return{first:async()=>{
 if(sql.includes('FROM team_tasks'))return {task_id:scope.taskId,step_id:scope.stepId,state:'verified',tool:'github.read',idempotency_key:scope.idempotencyKey};
 if(sql.includes('JOIN team_tool_step_grants'))return {task_id:scope.taskId,step_id:scope.stepId,state:'confirmed',receipt_id:scope.receiptId,evidence:'verified receipt text',tool:'github.read'};
 return {task_id:scope.taskId,step_id:scope.stepId,state:'confirmed',receipt_id:scope.receiptId,created_at:'2026-10-21 19:30:00'};
 }}}}}};
const approvalEvidence=async s=>({...s,kind:'owner-authenticated-approval',sourceVerified:true,approved:true,ownerAuthenticated:true,approvedBeforeExecution:true,approvedAt:'2026-10-21T19:00:00Z'});
const replayEvidence=async s=>({...s,kind:'observed-replay-denial',sourceVerified:true,denied:true,replayObservedAt:'2026-10-21T20:00:00Z'});
test('unconfigured attestation never certifies even with persisted D1 receipt',async()=>{
 const inspect=createExecutionAttestationReader({db});
 assert.deepEqual(await inspect(scope),{verified:false});
});
test('only separately source-verified approval and replay observation satisfy full chain',async()=>{
 const inspect=createExecutionAttestationReader({db,approvalEvidence,replayEvidence});
 assert.equal((await inspect(scope)).verified,true);
 for(const option of [
 {approvalEvidence:async s=>({...await approvalEvidence(s),sourceVerified:false})},
 {replayEvidence:async s=>({...await replayEvidence(s),denied:false})},
 {approvalEvidence:async s=>({...await approvalEvidence(s),taskId:'other-task'})}
 ])assert.equal((await createExecutionAttestationReader({db,approvalEvidence,replayEvidence,...option})(scope)).verified,false);
});
test('protected historical tasks are excluded even when inspectors report success',async()=>{
 const inspect=createExecutionAttestationReader({db,approvalEvidence,replayEvidence});
 for(const taskId of ['cert-github-read-20261018','cert-github-read-20261019-v2'])
  assert.deepEqual(await inspect({...scope,taskId}),{verified:false});
});
