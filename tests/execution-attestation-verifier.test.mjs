import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyExecutionAttestation} from '../lib/execution-attestation-verifier.mjs';
const proof={requirement:'real-read-adapter',taskId:'cert-new-safe-task',stepId:'github-repository-read',idempotencyKey:'new-safe-idempotency',receiptId:'receipt-safe-001'};
const inspectors={
 inspectTask:async s=>({...s,state:'verified',tool:'github.read'}),
 inspectLedger:async s=>({...s,found:true,state:'confirmed',receiptPresent:true,reservedAt:'2026-10-21 19:30:00'}),
 inspectApproval:async s=>({...s,approved:true,ownerAuthenticated:true,approvedBeforeExecution:true,approvedAt:'2026-10-21T19:00:00Z'}),
 inspectReceipt:async s=>({...s,durable:true,tool:'github.read'}),
 inspectReplayDenial:async s=>({...s,denied:true,replayObservedAt:'2026-10-21T20:00:00Z'})
};
test('requires five independently matching read-only inspectors',async()=>{
 assert.equal((await verifyExecutionAttestation(proof,inspectors)).verified,true);
 for(const name of Object.keys(inspectors)){
  const bad={...inspectors,[name]:async()=>({})};
  assert.equal((await verifyExecutionAttestation(proof,bad)).verified,false,name);
 }
});
test('protected tasks cannot be certified from this path',async()=>{
 for(const taskId of ['cert-github-read-20261018','cert-github-read-20261019-v2']){
  assert.equal((await verifyExecutionAttestation({...proof,taskId},inspectors)).verified,false);
 }
});
test('missing receipt, owner approval, replay denial and mismatched task fail closed',async()=>{
 const cases=[
  {inspectLedger:async s=>({...s,state:'needs-reconciliation',receiptPresent:false,found:true})},
  {inspectApproval:async s=>({...s,approved:true,ownerAuthenticated:false,approvedBeforeExecution:true})},
  {inspectReplayDenial:async s=>({...s,denied:false})},
  {inspectReceipt:async s=>({...s,taskId:'another-task',durable:true,tool:'github.read'})}
 ];
 for(const changes of cases)assert.equal((await verifyExecutionAttestation(proof,{...inspectors,...changes})).verified,false);
});
test('write and dependent multi-persona require scoped proof',async()=>{
 assert.equal((await verifyExecutionAttestation({...proof,requirement:'approved-write-adapter'},inspectors)).verified,false);
 assert.equal((await verifyExecutionAttestation({...proof,requirement:'persona-e2e'},inspectors)).verified,false);
});

test('forged approval chronology or missing reservation time cannot certify',async()=>{
 for(const overrides of [
  {inspectApproval:async s=>({...s,approved:true,ownerAuthenticated:true,approvedBeforeExecution:true,approvedAt:'2026-10-21T19:40:00Z'})},
  {inspectLedger:async s=>({...s,found:true,state:'confirmed',receiptPresent:true})},
  {inspectReplayDenial:async s=>({...s,denied:true,replayObservedAt:'2026-10-21T19:10:00Z'})}
 ])assert.equal((await verifyExecutionAttestation(proof,{...inspectors,...overrides})).verified,false);
});
