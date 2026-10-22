import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createSignedAuditEventProducer} from '../lib/signed-audit-event-producer.mjs';
import {createD1SignedAuditEventSource} from '../lib/d1-signed-audit-event-source.mjs';
import {createSignedProvenanceInspectors} from '../lib/signed-provenance-inspectors.mjs';

const issuer='atlas-audit-signer',deploymentCommit='a'.repeat(40),now='2026-10-21T20:00:00Z';
const scope={taskId:'safe-task-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123'};
const b64=b=>Buffer.from(b).toString('base64url');
const database=()=>{
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../migrations/0011_signed_audit_events.sql',import.meta.url),'utf8'));
 return {sqlite,db:{prepare(sql){return{bind(...args){return {
  run:async()=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}}),
  all:async()=>({results:sqlite.prepare(sql).all(...args)})
 }}}}}};
};
const trusted=async s=>({...s,originAuthenticated:true,
 ownerPrincipal:'owner-issuer-123',approved:true,ownerAuthenticated:true,
 approvedBeforeExecution:true,denied:true,reservationObserved:true,sourceEventAt:now});
test('signed records round-trip through real SQLite and independent pinned-key verifier',async()=>{
 const {db,sqlite}=database();
 try{
  const keys=await webcrypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const publicKey=b64(await webcrypto.subtle.exportKey('raw',keys.publicKey));
  const producer=createSignedAuditEventProducer({db,issuer,deploymentCommit,privateKey:keys.privateKey,observeTrustedEvent:trusted,clock:()=>now,cryptoImpl:webcrypto});
  for(const kind of ['owner-authenticated-approval','observed-replay-denial']){
   assert.equal((await producer.record({kind,...scope})).recorded,true);
  }
  const verify=createSignedProvenanceInspectors({readEvent:createD1SignedAuditEventSource({db}),
   publicKey,issuer,now,cryptoImpl:webcrypto});
  assert.equal((await verify.approvalEvidence(scope)).sourceVerified,true);
  assert.equal((await verify.replayEvidence(scope)).sourceVerified,true);
  assert.equal((await producer.record({kind:'owner-authenticated-approval',...scope})).recorded,false);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM team_signed_audit_events').get().count,2);
 }finally{sqlite.close()}
});
test('unauthenticated observations and protected certifications produce no audit evidence',async()=>{
 const {db,sqlite}=database();
 try{
  const keys=await webcrypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const p=createSignedAuditEventProducer({db,issuer,deploymentCommit,privateKey:keys.privateKey,
   observeTrustedEvent:async s=>({...s,originAuthenticated:false,approved:true,ownerAuthenticated:true,approvedBeforeExecution:true,ownerPrincipal:'owner-issuer-123'}),
   cryptoImpl:webcrypto,clock:()=>now});
  assert.equal((await p.record({kind:'owner-authenticated-approval',...scope})).recorded,false);
  const q=createSignedAuditEventProducer({db,issuer,deploymentCommit,privateKey:keys.privateKey,observeTrustedEvent:trusted,cryptoImpl:webcrypto,clock:()=>now});
  for(const taskId of ['cert-github-read-20261018','cert-github-read-20261019-v2'])
   assert.equal((await q.record({kind:'owner-authenticated-approval',...scope,taskId})).recorded,false);
  assert.equal(sqlite.prepare('SELECT count(*) AS count FROM team_signed_audit_events').get().count,0);
 }finally{sqlite.close()}
});
test('missing signer or database fails closed',async()=>{
 const signer=createSignedAuditEventProducer({issuer,deploymentCommit,observeTrustedEvent:trusted});
 assert.deepEqual(await signer.record({kind:'owner-authenticated-approval',...scope}),{recorded:false});
});
