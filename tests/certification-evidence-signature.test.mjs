import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {verifySignedCertificationEvidence,canonicalEvidencePayload} from '../lib/certification-evidence-signature.mjs';
globalThis.crypto ??= webcrypto;
const now=Date.parse('2026-10-26T12:00:00.000Z');
const base={environment:'staging',sourceCommit:'a'.repeat(40),databaseId:'953289d7-463f-4ba0-aa26-eca0ab2076d4',deploymentId:'f49582ff-332a-408b-b773-38f04fb743a4'};
const record={version:1,id:'evidence-example-0001',gate:'approved-agent-execution',
 taskId:'cert-atlas-staging-recovery-20261026-v1',environment:'staging',
 sourceCommit:base.sourceCommit,databaseId:base.databaseId,deploymentId:base.deploymentId,
 observedAt:'2026-10-26T11:00:00.000Z',expiresAt:'2026-10-26T13:00:00.000Z',
 status:'observed',receiptIds:['receipt-example-0001'],ownerDecisionId:'decision-example-0001',issuerId:'issuer-example-0001'};
const b64=bytes=>Buffer.from(bytes).toString('base64url');
async function issue(){
 const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const pub=await crypto.subtle.exportKey('jwk',kp.publicKey);
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,new TextEncoder().encode(canonicalEvidencePayload(record)));
 return {envelope:{record,signature:b64(sig),keyId:'test-issuer-key-0001'},context:{...base,pinnedPublicKey:pub,pinnedKeyId:'test-issuer-key-0001'}};
}
test('signed staging evidence verifies without granting execution or readiness',async()=>{
 const {envelope,context}=await issue();
 const result=await verifySignedCertificationEvidence(envelope,context,now);
 assert.deepEqual(result,{ok:true,reason:null,signatureVerified:true,readinessGranted:false,requiresDurableProvenanceAndReleaseVerification:true});
});
test('tampered receipt invalidates signature',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence({...envelope,record:{...record,receiptIds:['different-receipt-id']}},context,now);
 assert.equal(r.reason,'signature_invalid');
});
test('unknown fields cannot be smuggled into signed record',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence({...envelope,record:{...record,launchAuthorized:true}},context,now);
 assert.equal(r.reason,'invalid_signed_record_shape');
});
test('unknown envelope fields are rejected',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence({...envelope,override:true},context,now);
 assert.equal(r.reason,'invalid_envelope');
});
test('wrong signing key identity fails',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence({...envelope,keyId:'other-issuer-key-0001'},context,now);
 assert.equal(r.reason,'signing_key_not_pinned');
});
test('modified source commit fails before signature verification',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence(envelope,{...context,sourceCommit:'b'.repeat(40)},now);
 assert.equal(r.reason,'source_commit_mismatch');
});
test('stale evidence fails even with valid signature',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence(envelope,context,now+3600000);
 assert.equal(r.reason,'stale_or_excessive_lifetime');
});
test('invalid signature format fails closed',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence({...envelope,signature:'not-base64_?'},context,now);
 assert.equal(r.reason,'invalid_signature_encoding');
});
test('private key in public key context is rejected',async()=>{
 const {envelope,context}=await issue();
 const r=await verifySignedCertificationEvidence(envelope,{...context,pinnedPublicKey:{...context.pinnedPublicKey,d:'hidden'}},now);
 assert.equal(r.reason,'invalid_pinned_key');
});
test('unsigned evidence cannot pass',async()=>{
 const {context}=await issue();
 const r=await verifySignedCertificationEvidence(record,context,now);
 assert.equal(r.reason,'invalid_envelope');
});
