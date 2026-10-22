import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {canonicalSignedAuditPayload} from '../lib/signed-audit-canonical.mjs';
import {buildOfflineOriginToAuditPipeline} from '../lib/offline-origin-audit-pipeline.mjs';
import {createD1SignedAuditEventSource} from '../lib/d1-signed-audit-event-source.mjs';
import {createSignedProvenanceInspectors} from '../lib/signed-provenance-inspectors.mjs';
const scope={taskId:'safe-task-404',stepId:'safe-step-404',idempotencyKey:'safe-key-404'};
const originIssuer='origin-issuer-404',originSourceId='origin-source-404',auditIssuer='audit-issuer-404';
const now='2026-10-22T12:00:00Z',deploymentCommit='a'.repeat(40);
const b64=b=>Buffer.from(b).toString('base64url');
test('two append-only SQLite tables independently verify signed origin and audit artifact',async()=>{
 const sqlite=new DatabaseSync(':memory:');
 try{
  for(const n of ['0011_signed_audit_events.sql','0012_origin_observations.sql'])
   sqlite.exec(readFileSync(new URL('../migrations/'+n,import.meta.url),'utf8'));
  const sourceKeys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
  const auditKeys=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
  const kind='owner-authenticated-approval';
  const event={kind,...scope,eventId:'source-event-404',sourceId:originSourceId,
   sourceEventAt:now,ownerPrincipal:'owner-principal-404',
   approved:true,ownerAuthenticated:true,approvedBeforeExecution:true};
  const sig=b64(await webcrypto.subtle.sign('Ed25519',sourceKeys.privateKey,canonicalSignedAuditPayload(originIssuer,event)));
  sqlite.prepare('INSERT INTO team_origin_observations(event_id,source_id,issuer,kind,task_id,step_id,idempotency_key,event_json,signature) VALUES(?,?,?,?,?,?,?,?,?)')
   .run(event.eventId,originSourceId,originIssuer,kind,scope.taskId,scope.stepId,scope.idempotencyKey,JSON.stringify(event),sig);
  const db={prepare(sql){return{bind(...args){return{
   all:async()=>({results:sqlite.prepare(sql).all(...args)}),
   run:async()=>({meta:{changes:sqlite.prepare(sql).run(...args).changes}})
  }}}}};
  const pipeline=buildOfflineOriginToAuditPipeline({db,originIssuer,originSourceId,
   originPublicKey:b64(await webcrypto.subtle.exportKey('raw',sourceKeys.publicKey)),
   auditIssuer,auditPrivateKey:auditKeys.privateKey,deploymentCommit,now,cryptoImpl:webcrypto});
  assert.equal((await pipeline.record({kind,...scope})).recorded,true);
  const verified=createSignedProvenanceInspectors({readEvent:createD1SignedAuditEventSource({db}),issuer:auditIssuer,
   publicKey:b64(await webcrypto.subtle.exportKey('raw',auditKeys.publicKey)),deploymentCommit,now,cryptoImpl:webcrypto});
  assert.equal((await verified.approvalEvidence(scope)).sourceVerified,true);
  assert.equal((await pipeline.record({kind,...scope})).recorded,false);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS c FROM team_signed_audit_events').get().c,1);
 }finally{sqlite.close()}
});
test('missing configuration and protected tasks are denied',async()=>{
 const pipeline=buildOfflineOriginToAuditPipeline({});
 assert.deepEqual(await pipeline.record({kind:'owner-authenticated-approval',...scope}),{recorded:false});
});
