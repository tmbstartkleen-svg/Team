import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyCertificationEvidenceAgainstD1} from '../lib/certification-evidence-d1-verifier.mjs';
const now=Date.parse('2026-10-26T12:00:00.000Z');
const context={environment:'staging',sourceCommit:'a'.repeat(40),databaseId:'953289d7-463f-4ba0-aa26-eca0ab2076d4',deploymentId:'f49582ff-332a-408b-b773-38f04fb743a4'};
const record={version:1,id:'evidence-example-0001',gate:'approved-agent-execution',
 taskId:'cert-atlas-staging-recovery-20261026-v1',environment:'staging',
 sourceCommit:context.sourceCommit,databaseId:context.databaseId,deploymentId:context.deploymentId,
 observedAt:'2026-10-26T11:00:00.000Z',expiresAt:'2026-10-26T13:00:00.000Z',
 status:'observed',receiptIds:['receipt-example-0001'],ownerDecisionId:'decision-example-0001',issuerId:'issuer-example-0001'};
function fixture({task,approval,receipts}={}){
 const rows={
 task:task===undefined?{state:'verified',owner_approved:1,attempt_count:1,completion_evidence:'bounded answer saved'}:task,
 approval:approval===undefined?{id:record.ownerDecisionId,actor:'owner',decision:'approved'}:approval,
 receipts:receipts===undefined?[{id:record.receiptIds[0],task_id:record.taskId,attempt_count:1,outcome:'verified',evidence:'bounded answer saved'}]:receipts
 };
 const calls=[];
 const db={prepare(sql){return {bind(...args){calls.push({sql,args});return {first:async()=>sql.includes('team_approval_audit')?rows.approval:rows.task,all:async()=>({results:rows.receipts})}}}}};
 return {db,calls};
}
test('matching durable records are corroborated but do not grant launch readiness',async()=>{
 const {db,calls}=fixture();
 const result=await verifyCertificationEvidenceAgainstD1(db,record,context,now);
 assert.deepEqual(result,{ok:true,reason:null,independentlyCorroborated:true,readinessGranted:false,requiresIndependentIssuerAndReleaseVerification:true});
 assert.equal(calls.length,3);
 assert.equal(calls[0].args[0],record.taskId);
 assert.deepEqual(calls[2].args,[record.taskId,record.receiptIds[0]]);
});
for(const [name,patch,expected] of [
 ['unapproved task',{task:{state:'verified',owner_approved:0,attempt_count:1,completion_evidence:'bounded answer saved'}},'task_not_verified'],
 ['no task',{task:null},'task_not_verified'],
 ['no owner audit',{approval:null},'owner_approval_not_verified'],
 ['rejected owner',{approval:{actor:'owner',decision:'rejected'}},'owner_approval_not_verified'],
 ['fabricated receipt',{receipts:[]},'receipt_provenance_not_verified'],
 ['wrong task receipt',{receipts:[{id:'receipt-example-0001',task_id:'another-task',attempt_count:1,outcome:'verified',evidence:'bounded answer saved'}]},'receipt_provenance_not_verified'],
 ['mismatched evidence',{receipts:[{id:'receipt-example-0001',task_id:record.taskId,attempt_count:1,outcome:'verified',evidence:'different answer'}]},'receipt_provenance_not_verified'],
 ['replayed attempt',{receipts:[{id:'receipt-example-0001',task_id:record.taskId,attempt_count:2,outcome:'verified',evidence:'bounded answer saved'}]},'receipt_provenance_not_verified'],
 ['duplicate matching rows',{receipts:[{id:'receipt-example-0001',task_id:record.taskId,attempt_count:1,outcome:'verified',evidence:'bounded answer saved'},{id:'receipt-example-0001',task_id:record.taskId,attempt_count:1,outcome:'verified',evidence:'bounded answer saved'}]},'receipt_provenance_not_verified']
]){
 test('denies '+name,async()=>{
  const result=await verifyCertificationEvidenceAgainstD1(fixture(patch).db,record,context,now);
  assert.equal(result.ok,false);assert.equal(result.reason,expected);assert.equal(result.readinessGranted,false);
 });
}
test('non-execution gates must have independent dedicated verifiers',async()=>{
 const result=await verifyCertificationEvidenceAgainstD1(fixture().db,{...record,gate:'live-inference-certified'},context,now);
 assert.equal(result.reason,'gate_provenance_not_supported');
});
test('missing D1 binding fails closed',async()=>{
 const result=await verifyCertificationEvidenceAgainstD1(null,record,context,now);
 assert.equal(result.reason,'database_not_bound');
});
test('structurally expired evidence never reads the database',async()=>{
 const result=await verifyCertificationEvidenceAgainstD1({prepare(){throw Error('should not query')}},record,context,now+3600000);
 assert.equal(result.reason,'stale_or_excessive_lifetime');
});
test('D1 errors do not prove execution',async()=>{
 const result=await verifyCertificationEvidenceAgainstD1({prepare(){throw Error('database offline')}},record,context,now);
 assert.equal(result.reason,'database_verification_failed');
});
