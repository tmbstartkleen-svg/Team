import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {canonicalEvidencePayload} from '../lib/certification-evidence-signature.mjs';
import {verifyTrustedStagingAttestation} from '../lib/trusted-staging-attestation.mjs';
globalThis.crypto ??= webcrypto;
const now=Date.parse('2026-10-26T12:00:00.000Z');
const record={version:1,id:'evidence-issuer-lifecycle-01',gate:'approved-agent-execution',
 taskId:'cert-atlas-staging-recovery-20261026-v1',environment:'staging',
 sourceCommit:'a'.repeat(40),databaseId:'953289d7-463f-4ba0-aa26-eca0ab2076d4',
 deploymentId:'f49582ff-332a-408b-b773-38f04fb743a4',
 observedAt:'2026-10-26T11:00:00.000Z',expiresAt:'2026-10-26T13:00:00.000Z',
 status:'observed',receiptIds:['receipt-issuer-example-01'],
 ownerDecisionId:'decision-issuer-example-01',issuerId:'staging-certifier-001'};
async function setup(){
 const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,new TextEncoder().encode(canonicalEvidencePayload(record)));
 const envelope={record,signature:Buffer.from(signature).toString('base64url'),keyId:'staging-issuer-key-001'};
 const trust={environment:'staging',pinnedIssuerId:record.issuerId,pinnedKeyId:envelope.keyId,
  pinnedPublicKey:await crypto.subtle.exportKey('jwk',kp.publicKey),
  sourceCommit:record.sourceCommit,databaseId:record.databaseId,deploymentId:record.deploymentId,
  keyValidFrom:'2026-10-25T00:00:00.000Z',keyValidUntil:'2026-10-27T00:00:00.000Z',
  revokedKeyIds:[]};
 let calls=0;
 const db={get calls(){return calls},prepare(sql){calls++;return {bind(){return {
  first:async()=>sql.includes('team_approval_audit')
   ?{id:record.ownerDecisionId,actor:'owner',decision:'approved'}
   :{state:'verified',owner_approved:1,attempt_count:1,completion_evidence:'approved analysis completed'},
  all:async()=>({results:[{id:record.receiptIds[0],task_id:record.taskId,attempt_count:1,outcome:'verified',evidence:'approved analysis completed'}]})
 }}}}};
 return {envelope,trust,db};
}
test('trusted issuer, scoped key and D1 evidence corroborate without release',async()=>{
 const args=await setup();
 const r=await verifyTrustedStagingAttestation({...args,now});
 assert.equal(r.ok,true);assert.equal(r.issuerIdentityVerified,true);
 assert.equal(r.keyLifecycleVerified,true);assert.equal(r.readinessGranted,false);
 assert.equal(args.db.calls,3);
});
for(const [label,patch,expected] of [
 ['wrong issuer',{pinnedIssuerId:'other-certifier-001'},'issuer_identity_mismatch'],
 ['revoked key',{revokedKeyIds:['staging-issuer-key-001']},'key_revoked_or_status_unknown'],
 ['absent revocation source',{revokedKeyIds:null},'key_revoked_or_status_unknown'],
 ['expired key',{keyValidUntil:'2026-10-26T11:30:00.000Z'},'issuer_key_outside_trust_window'],
 ['not-yet-valid key',{keyValidFrom:'2026-10-26T11:30:00.000Z'},'issuer_key_outside_trust_window'],
 ['unknown trust interval',{keyValidUntil:null},'issuer_key_outside_trust_window'],
 ['production context',{environment:'production'},'trusted_staging_context_missing'],
 ['deployment mismatch',{deploymentId:'00000000-0000-0000-0000-000000000000'},'deployment_mismatch']
]){
 test('fail closed: '+label,async()=>{
  const args=await setup(),db=args.db;
  const r=await verifyTrustedStagingAttestation({...args,trust:{...args.trust,...patch},now});
  assert.equal(r.ok,false);assert.equal(r.reason,expected);assert.equal(r.readinessGranted,false);
  assert.equal(db.calls,0);
 });
}
test('omitted trust anchor fails before any D1 query',async()=>{
 const args=await setup();
 const r=await verifyTrustedStagingAttestation({db:args.db,envelope:args.envelope,now});
 assert.equal(r.reason,'trusted_staging_context_missing');assert.equal(args.db.calls,0);
});
test('tampering after signature is rejected before reading D1',async()=>{
 const args=await setup();
 const envelope={...args.envelope,record:{...args.envelope.record,receiptIds:['fake-receipt-0001']}};
 const r=await verifyTrustedStagingAttestation({...args,envelope,now});
 assert.equal(r.reason,'signature_invalid');assert.equal(args.db.calls,0);
});
