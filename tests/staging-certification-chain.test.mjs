import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {canonicalEvidencePayload} from '../lib/certification-evidence-signature.mjs';
import {verifyStagingCertificationChain} from '../lib/staging-certification-chain.mjs';
globalThis.crypto ??= webcrypto;
const now=Date.parse('2026-10-26T12:00:00.000Z');
const ctx={environment:'staging',sourceCommit:'a'.repeat(40),
 databaseId:'953289d7-463f-4ba0-aa26-eca0ab2076d4',
 deploymentId:'f49582ff-332a-408b-b773-38f04fb743a4'};
const record={version:1,id:'evidence-example-0001',gate:'approved-agent-execution',
 taskId:'cert-atlas-staging-recovery-20261026-v1',environment:'staging',
 sourceCommit:ctx.sourceCommit,databaseId:ctx.databaseId,deploymentId:ctx.deploymentId,
 observedAt:'2026-10-26T11:00:00.000Z',expiresAt:'2026-10-26T13:00:00.000Z',status:'observed',
 receiptIds:['receipt-example-0001'],ownerDecisionId:'decision-example-0001',issuerId:'issuer-example-0001'};
async function sign(){
 const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const pub=await crypto.subtle.exportKey('jwk',kp.publicKey);
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,new TextEncoder().encode(canonicalEvidencePayload(record)));
 return {envelope:{record,signature:Buffer.from(sig).toString('base64url'),keyId:'trusted-staging-key-01'},context:{...ctx,pinnedKeyId:'trusted-staging-key-01',pinnedPublicKey:pub}};
}
function database({approved=true,receipts=true}={}){
 const task={state:'verified',owner_approved:approved?1:0,attempt_count:1,completion_evidence:'bounded answer saved'};
 const receipt={id:'receipt-example-0001',task_id:record.taskId,attempt_count:1,outcome:'verified',evidence:'bounded answer saved'};
 let calls=0;
 return {get calls(){return calls},prepare(sql){calls++;return {bind(){return {
  first:async()=>sql.includes('team_approval_audit')?{id:record.ownerDecisionId,actor:'owner',decision:'approved'}:task,
  all:async()=>({results:receipts?[receipt]:[]})
 }}}}};
}
test('signed and corroborated evidence never grants readiness or release',async()=>{
 const {envelope,context}=await sign();const db=database();
 const r=await verifyStagingCertificationChain({db,envelope,context,now});
 assert.deepEqual(r,{ok:true,signatureVerified:true,durableEvidenceCorroborated:true,
  gate:'approved-agent-execution',taskId:record.taskId,readinessGranted:false,
  requiresTrustedDeploymentAndIssuerAttestation:true,requiresSeparatelyAuthorizedRelease:true});
 assert.equal(db.calls,3);
});
test('unsigned evidence rejected without D1 queries',async()=>{
 const {envelope,context}=await sign();const db=database();
 const r=await verifyStagingCertificationChain({db,envelope:{...envelope,signature:'forged'},context,now});
 assert.equal(r.ok,false);assert.equal(r.phase,'signature');assert.equal(db.calls,0);
});
test('valid signature and forged D1 receipt rejected',async()=>{
 const {envelope,context}=await sign();
 const r=await verifyStagingCertificationChain({db:database({receipts:false}),envelope,context,now});
 assert.equal(r.reason,'receipt_provenance_not_verified');assert.equal(r.phase,'provenance');
});
test('valid signature but unapproved task rejected',async()=>{
 const {envelope,context}=await sign();
 const r=await verifyStagingCertificationChain({db:database({approved:false}),envelope,context,now});
 assert.equal(r.reason,'task_not_verified');assert.equal(r.readinessGranted,false);
});
test('wrong deployment rejected before D1 read',async()=>{
 const {envelope,context}=await sign();const db=database();
 const r=await verifyStagingCertificationChain({db,envelope,context:{...context,deploymentId:'00000000-0000-0000-0000-000000000000'},now});
 assert.equal(r.reason,'deployment_mismatch');assert.equal(db.calls,0);
});
test('production context rejected before signature',async()=>{
 const {envelope,context}=await sign();const db=database();
 const r=await verifyStagingCertificationChain({db,envelope,context:{...context,environment:'production'},now});
 assert.equal(r.reason,'staging_context_required');assert.equal(db.calls,0);
});
test('missing database denied',async()=>{
 const {envelope,context}=await sign();
 const r=await verifyStagingCertificationChain({db:null,envelope,context,now});
 assert.equal(r.reason,'database_not_bound');
});
test('expired record rejected even with valid signature',async()=>{
 const {envelope,context}=await sign();const db=database();
 const r=await verifyStagingCertificationChain({db,envelope,context,now:now+3600000});
 assert.equal(r.reason,'stale_or_excessive_lifetime');assert.equal(db.calls,0);
});
