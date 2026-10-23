import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareExecutionContract,assessExecutionAuthorization} from '../lib/execution-contracts.mjs';
import {describeProviderRuntime} from '../lib/provider-runtime-contract.mjs';
import {createPreparationReceipt} from '../lib/execution-audit.mjs';
test('preflight prepares a deterministic non-executable plan with no side effects',()=>{
 const a=prepareExecutionContract({title:'Research customer retention metrics'});
 const b=prepareExecutionContract({title:'Research customer retention metrics'});
 assert.deepEqual(a,b);assert.equal(a.executable,false);assert.equal(a.databaseWrites,0);
 assert.equal(a.providerRequests,0);assert.equal(a.approvalState,'not-approved');
 const auth=assessExecutionAuthorization(a,{capability:'research.read'});
 assert.equal(auth.permittedForPlanning,true);assert.equal(auth.executionAuthorized,false);
 const receipt=createPreparationReceipt(a,auth);
 assert.equal(receipt.recordPersisted,false);assert.equal(receipt.sideEffects,0);
});
test('external and dangerous capabilities are rejected before preparation',()=>{
 for(const capability of ['production.deploy','credential.read','payment.send','external.write','task.execute','message.send','unknown']){
  assert.throws(()=>prepareExecutionContract({title:'Prepare work plan',capabilities:[capability]}),/capability_not_authorized/);
 }
});
test('valid plan cannot authorize a real execution',()=>{
 const a=prepareExecutionContract({title:'Draft a report'});
 assert.equal(assessExecutionAuthorization(a,{capability:'report.draft'}).executionAuthorized,false);
 assert.equal(assessExecutionAuthorization(a,{capability:'research.read'}).permittedForPlanning,true);
});
test('provider adapter never claims connection or credentials',()=>{
 for(const selected of ['openai','cloudflare-workers-ai','local','unrecognized']){
  const runtime=describeProviderRuntime({provider:selected});
  assert.equal(runtime.connected,false);assert.equal(runtime.requestsEnabled,false);
  assert.equal(runtime.credentialsLoaded,false);
 }
});
