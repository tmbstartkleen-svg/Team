import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyExecutionAttestation} from '../lib/execution-attestation-verifier.mjs';
const proof={requirement:'real-read-adapter',taskId:'cert-new-safe-task',stepId:'github-repository-read',idempotencyKey:'new-safe-idempotency',receiptId:'receipt-safe-001'};
const inspectors={
 inspectTask:async s=>({...s,state:'completed',tool:'github.read'}),
 inspectLedger:async s=>({...s,found:true,state:'confirmed',receiptPresent:true}),
 inspectApproval:async s=>({...s,approved:true,ownerAuthenticated:true,approvedBeforeExecution:true}),
 inspectReceipt:async s=>({...s,durable:true,tool:'github.read'}),
 inspectReplayDenial:async s=>({...s,denied:true})
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
