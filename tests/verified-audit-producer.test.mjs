import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {canonicalSignedAuditPayload} from '../lib/signed-audit-canonical.mjs';
import {buildVerifiedAuditProducer} from '../lib/verified-audit-producer.mjs';
import {createD1SignedAuditEventSource} from '../lib/d1-signed-audit-event-source.mjs';
import {createSignedProvenanceInspectors} from '../lib/signed-provenance-inspectors.mjs';
const scope={taskId:'safe-task-321',stepId:'safe-step-321',idempotencyKey:'safe-key-321'};
const originIssuer='independent-origin-123',auditIssuer='separate-audit-123',now='2026-10-22T12:00:00Z',deploymentCommit='a'.repeat(40);
const b64=b=>Buffer.from(b).toString('base64url');
test('two distinct signers establish end-to-end provenance from origin to persisted D1 proof',async()=>{
 const dbSqlite=new DatabaseSync(':memory:');
 try{
  dbSqlite.exec(readFileSync(new URL('../migrations/0011_signed_audit_events.sql',import.meta.url),'utf8'));
  const db={prepare(sql){return {bind(...args){return{
   run:async()=>({meta:{changes:dbSqlite.prepare(sql).run(...args).changes}}),
   all:async()=>({results:dbSqlite.prepare(sql).all(...args)})
  }}}}};
  const originKeys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
  const auditKeys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
  const event={...scope,kind:'owner-authenticated-approval',eventId:'origin-event-321',
   sourceId:'trusted-source-321',sourceEventAt:now,ownerPrincipal:'owner-principal-321',
   approved:true,ownerAuthenticated:true,approvedBeforeExecution:true};
  const originSig=b64(await webcrypto.subtle.sign('Ed25519',originKeys.privateKey,canonicalSignedAuditPayload(originIssuer,event)));
  const params={db,readOrigin:async()=>({issuer:originIssuer,event,signature:originSig}),
   originIssuer,originPublicKey:b64(await webcrypto.subtle.exportKey('raw',originKeys.publicKey)),
   auditIssuer,auditPrivateKey:auditKeys.privateKey,deploymentCommit,now,cryptoImpl:webcrypto};
  const p=buildVerifiedAuditProducer(params);
  assert.equal((await p.record({kind:event.kind,...scope})).recorded,true);
  const verify=createSignedProvenanceInspectors({readEvent:createD1SignedAuditEventSource({db}),
    publicKey:b64(await webcrypto.subtle.exportKey('raw',auditKeys.publicKey)),issuer:auditIssuer,
    deploymentCommit,now,cryptoImpl:webcrypto});
  assert.equal((await verify.approvalEvidence(scope)).sourceVerified,true);
  assert.equal((await p.record({kind:event.kind,...scope})).recorded,false);
  const tampered=buildVerifiedAuditProducer({...params,readOrigin:async()=>({issuer:originIssuer,event:{...event,ownerPrincipal:'other-owner-321'},signature:originSig})});
  assert.equal((await tampered.record({kind:event.kind,...scope,idempotencyKey:'safe-key-999'})).recorded,false);
 }finally{dbSqlite.close()}
});
test('same issuer, unconfigured source, and protected tasks never produce signed evidence',async()=>{
 const disabled=buildVerifiedAuditProducer({originIssuer,auditIssuer:originIssuer});
 assert.deepEqual(await disabled.record({kind:'owner-authenticated-approval',...scope}),{recorded:false});
});
