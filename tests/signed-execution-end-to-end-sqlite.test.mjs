import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createSignedAuditEventProducer} from '../lib/signed-audit-event-producer.mjs';
import {createD1SignedAuditEventSource} from '../lib/d1-signed-audit-event-source.mjs';
import {createSignedExecutionAttestationReader} from '../lib/signed-execution-attestation-reader.mjs';
const scope={requirement:'real-read-adapter',taskId:'safe-cert-100',stepId:'safe-step-100',idempotencyKey:'safe-key-100',receiptId:'safe-receipt-100'};
const commit='a'.repeat(40),issuer='atlas-audit-signer';
const b64=b=>Buffer.from(b).toString('base64url');
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(readFileSync(new URL('../migrations/0011_signed_audit_events.sql',import.meta.url),'utf8'));
 sqlite.exec('CREATE TABLE team_tasks(id TEXT PRIMARY KEY,state TEXT); CREATE TABLE team_tool_step_grants(task_id TEXT,step_id TEXT,tool TEXT,idempotency_key TEXT); CREATE TABLE team_tool_action_ledger(task_id TEXT,step_id TEXT,idempotency_key TEXT,state TEXT,receipt_id TEXT,evidence TEXT,created_at TEXT)');
 sqlite.prepare('INSERT INTO team_tasks VALUES(?,?)').run(scope.taskId,'verified');
 sqlite.prepare('INSERT INTO team_tool_step_grants VALUES(?,?,?,?)').run(scope.taskId,scope.stepId,'github.read',scope.idempotencyKey);
 sqlite.prepare('INSERT INTO team_tool_action_ledger VALUES(?,?,?,?,?,?,?)').run(scope.taskId,scope.stepId,scope.idempotencyKey,'confirmed',scope.receiptId,'real durable receipt fixture','2026-10-21 19:30:00');
 const db={prepare(sql){return {bind(...params){return{
  first:async()=>sqlite.prepare(sql).get(...params),
  all:async()=>({results:sqlite.prepare(sql).all(...params)}),
  run:async()=>({meta:{changes:sqlite.prepare(sql).run(...params).changes}})
 }}}}};
 return {sqlite,db};
}
test('signed approval precedes reservation and signed replay denial follows it',async()=>{
 const {sqlite,db}=fixture();
 try{
  const pair=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
  const publicKey=b64(await webcrypto.subtle.exportKey('raw',pair.publicKey));
  let signingAt='2026-10-21T19:01:00Z';
  const observer=async s=>({...s,originAuthenticated:true,sourceId:'origin-source-123',eventId:s.kind==='owner-authenticated-approval'?'origin-approval-123':'origin-replay-123',ownerPrincipal:'owner-issuer-123',
   approved:true,ownerAuthenticated:true,approvedBeforeExecution:true,denied:true,
   reservationObserved:true,sourceEventAt:s.kind==='owner-authenticated-approval'
    ?'2026-10-21T19:00:00Z':'2026-10-21T20:00:00Z'});
  const producer=createSignedAuditEventProducer({db,issuer,deploymentCommit:commit,
   privateKey:pair.privateKey,observeTrustedEvent:observer,clock:()=>signingAt,cryptoImpl:webcrypto});
  assert.equal((await producer.record({kind:'owner-authenticated-approval',...scope})).recorded,true);
  signingAt='2026-10-21T20:01:00Z';
  assert.equal((await producer.record({kind:'observed-replay-denial',...scope})).recorded,true);
  const inspector=createSignedExecutionAttestationReader({db,issuer,publicKey,deploymentCommit:commit,
   now:'2026-10-21T20:02:00Z',cryptoImpl:webcrypto,readEvent:createD1SignedAuditEventSource({db})});
  assert.equal((await inspector(scope)).verified,true);
  // A fully signed chain must still fail when its persisted ledger scope changes.
  sqlite.prepare('UPDATE team_tool_action_ledger SET task_id=?').run('different-task-100');
  assert.deepEqual(await inspector(scope),{verified:false});
  sqlite.prepare('UPDATE team_tool_action_ledger SET task_id=?').run(scope.taskId);
  assert.equal((await inspector(scope)).verified,true);
  // Altering the pinned commit cannot be rescued by valid signatures.
  const wrongCommit=createSignedExecutionAttestationReader({db,issuer,publicKey,deploymentCommit:'b'.repeat(40),
   now:'2026-10-21T20:02:00Z',cryptoImpl:webcrypto,readEvent:createD1SignedAuditEventSource({db})});
  assert.deepEqual(await wrongCommit(scope),{verified:false});
  sqlite.prepare('UPDATE team_tool_action_ledger SET created_at=?').run('2026-10-21 18:30:00');
  assert.deepEqual(await inspector(scope),{verified:false});
 }finally{sqlite.close()}
});
test('wrong release commit and absent signed sources remain unverified',async()=>{
 const {sqlite,db}=fixture();
 try{
  const inspector=createSignedExecutionAttestationReader({db,issuer,deploymentCommit:commit,
   now:'2026-10-21T20:02:00Z',cryptoImpl:webcrypto});
  assert.deepEqual(await inspector(scope),{verified:false});
 }finally{sqlite.close()}
});
