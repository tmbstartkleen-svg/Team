import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCertificationEvidence} from '../lib/certification-evidence-contract.mjs';
const now=Date.parse('2026-10-26T12:00:00.000Z');
const ctx={environment:'staging',sourceCommit:'a'.repeat(40),databaseId:'953289d7-463f-4ba0-aa26-eca0ab2076d4',deploymentId:'f49582ff-332a-408b-b773-38f04fb743a4'};
const evidence={
 version:1,id:'evidence-example-0001',gate:'approved-agent-execution',
 taskId:'cert-atlas-staging-recovery-20261026-v1',environment:'staging',
 sourceCommit:ctx.sourceCommit,databaseId:ctx.databaseId,deploymentId:ctx.deploymentId,
 observedAt:'2026-10-26T11:00:00.000Z',expiresAt:'2026-10-26T13:00:00.000Z',
 status:'observed',receiptIds:['receipt-example-0001'],ownerDecisionId:'decision-example-0001',issuerId:'issuer-example-0001'
};
test('valid staging-shaped evidence never grants release readiness',()=>{
 assert.deepEqual(validateCertificationEvidence(evidence,ctx,now),{ok:true,reason:null,readinessGranted:false,requiresIndependentVerification:true});
});
for(const [name,patch,context,clock,reason] of [
 ['wrong source',{sourceCommit:'b'.repeat(40)},ctx,now,'source_commit_mismatch'],
 ['wrong database',{databaseId:'00000000-0000-0000-0000-000000000000'},ctx,now,'database_mismatch'],
 ['wrong deployment',{deploymentId:'00000000-0000-0000-0000-000000000000'},ctx,now,'deployment_mismatch'],
 ['production environment',{environment:'production'},ctx,now,'environment_not_staging'],
 ['production context',{}, {...ctx,environment:'production'},now,'environment_not_staging'],
 ['expired',{},ctx,Date.parse('2026-10-26T13:00:00.000Z'),'stale_or_excessive_lifetime'],
 ['future timestamp',{observedAt:'2026-10-27T11:00:00.000Z'},ctx,now,'stale_or_excessive_lifetime'],
 ['overlong expiry',{expiresAt:'2026-10-29T13:00:00.000Z'},ctx,now,'stale_or_excessive_lifetime'],
 ['revoked',{status:'revoked'},ctx,now,'not_observed'],
 ['no receipts',{receiptIds:[]},ctx,now,'invalid_receipts'],
 ['duplicate receipts',{receiptIds:['receipt-example-0001','receipt-example-0001']},ctx,now,'invalid_receipts'],
 ['missing owner evidence',{ownerDecisionId:null},ctx,now,'missing_authorization_references'],
 ['protected task',{taskId:'cert-github-read-20261019-v2'},ctx,now,'protected_task_forbidden'],
 ['unsupported gate',{gate:'productionOperational'},ctx,now,'unsupported_evidence'],
 ['malformed id',{id:'bad'},ctx,now,'invalid_identity']
]){
 test('rejects '+name,()=>{
  const result=validateCertificationEvidence({...evidence,...patch},context,clock);
  assert.equal(result.ok,false);assert.equal(result.reason,reason);assert.equal(result.readinessGranted,false);
 });
}
test('missing evidence always fails closed',()=>assert.equal(validateCertificationEvidence(null,ctx,now).ok,false));
