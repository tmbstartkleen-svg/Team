import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {webcrypto,createHash} from 'node:crypto';
import {canonicalEvidencePayload} from '../lib/certification-evidence-signature.mjs';
import {verifyPersistedStagingEvidence} from '../lib/d1-persisted-certification-evidence.mjs';
globalThis.crypto??=webcrypto;
const now=Date.parse('2026-10-26T12:00:00.000Z');
const record={version:1,id:'evidence-persisted-test-01',gate:'approved-agent-execution',
 taskId:'cert-atlas-staging-recovery-20261026-v1',environment:'staging',
 sourceCommit:'a'.repeat(40),databaseId:'953289d7-463f-4ba0-aa26-eca0ab2076d4',
 deploymentId:'f49582ff-332a-408b-b773-38f04fb743a4',
 observedAt:'2026-10-26T11:00:00.000Z',expiresAt:'2026-10-26T13:00:00.000Z',
 status:'observed',receiptIds:['receipt-persisted-test-01'],
 ownerDecisionId:'decision-persisted-test-01',issuerId:'staging-certifier-001'};
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE team_tasks(id TEXT PRIMARY KEY,state TEXT,owner_approved INTEGER,attempt_count INTEGER,completion_evidence TEXT);
 CREATE TABLE team_approval_audit(id TEXT PRIMARY KEY,task_id TEXT,actor TEXT,decision TEXT);
 CREATE TABLE team_execution_receipts(id TEXT PRIMARY KEY,task_id TEXT,attempt_count INTEGER,outcome TEXT,evidence TEXT);`);
 const schema=readFileSync(new URL('../design/staging-certification-evidence-schema.draft.sql',import.meta.url),'utf8');
 sqlite.exec(schema);
 const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const keyId='staging-evidence-key-001';
 const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,new TextEncoder().encode(canonicalEvidencePayload(record)));
 const envelope={record,signature:Buffer.from(signature).toString('base64url'),keyId};
 const raw=JSON.stringify(envelope),hash=createHash('sha256').update(raw).digest('hex');
 sqlite.prepare('INSERT INTO team_tasks VALUES (?,?,?,?,?)').run(record.taskId,'verified',1,1,'approved analysis completed');
 sqlite.prepare('INSERT INTO team_approval_audit VALUES (?,?,?,?)').run(record.ownerDecisionId,record.taskId,'owner','approved');
 sqlite.prepare('INSERT INTO team_execution_receipts VALUES (?,?,?,?,?)').run(record.receiptIds[0],record.taskId,1,'verified','approved analysis completed');
 sqlite.prepare('INSERT INTO team_certification_evidence (id,task_id,gate,envelope_json,envelope_sha256) VALUES (?,?,?,?,?)').run(record.id,record.taskId,record.gate,raw,hash);
 const trust={environment:'staging',pinnedIssuerId:record.issuerId,pinnedKeyId:keyId,
  pinnedPublicKey:await crypto.subtle.exportKey('jwk',kp.publicKey),
  sourceCommit:record.sourceCommit,databaseId:record.databaseId,deploymentId:record.deploymentId,
  keyValidFrom:'2026-10-25T00:00:00.000Z',keyValidUntil:'2026-10-27T00:00:00.000Z',revokedKeyIds:[]};
 const db={prepare(sql){return {bind(...args){return {
  first:async()=>sqlite.prepare(sql).get(...args)||null,
  all:async()=>({results:sqlite.prepare(sql).all(...args)})
 }}}}};
 return {sqlite,db,trust};
}
test('real SQLite stored signed evidence verifies but does not grant release',async()=>{
 const f=await fixture();try{
  const r=await verifyPersistedStagingEvidence({db:f.db,evidenceId:record.id,trust:f.trust,now});
  assert.equal(r.ok,true);assert.equal(r.readinessGranted,false);assert.equal(r.requiresOwnerRelease,true);
 }finally{f.sqlite.close()}
});
test('immutable evidence rejects UPDATE and DELETE',async()=>{
 const f=await fixture();try{
  assert.throws(()=>f.sqlite.prepare('UPDATE team_certification_evidence SET gate=? WHERE id=?').run('persona-identity',record.id),/immutable_certification_evidence/);
  assert.throws(()=>f.sqlite.prepare('DELETE FROM team_certification_evidence WHERE id=?').run(record.id),/immutable_certification_evidence/);
 }finally{f.sqlite.close()}
});
test('separately logged revocation blocks existing signed record',async()=>{
 const f=await fixture();try{
  f.sqlite.prepare('INSERT INTO team_certification_revocations(id,evidence_id,reason) VALUES (?,?,?)').run('revocation-persisted-01',record.id,'owner revoked');
  const r=await verifyPersistedStagingEvidence({db:f.db,evidenceId:record.id,trust:f.trust,now});
  assert.equal(r.reason,'evidence_revoked');assert.equal(r.readinessGranted,false);
  assert.throws(()=>f.sqlite.prepare('DELETE FROM team_certification_revocations WHERE evidence_id=?').run(record.id),/immutable_certification_revocation/);
 }finally{f.sqlite.close()}
});
test('duplicate evidence identifier cannot overwrite stored record',async()=>{
 const f=await fixture();try{
  assert.throws(()=>f.sqlite.prepare('INSERT INTO team_certification_evidence(id,task_id,gate,envelope_json,envelope_sha256) SELECT id,task_id,gate,envelope_json,envelope_sha256 FROM team_certification_evidence WHERE id=?').run(record.id),/UNIQUE constraint failed/);
 }finally{f.sqlite.close()}
});
test('wrong trusted deployment rejected',async()=>{
 const f=await fixture();try{
  const r=await verifyPersistedStagingEvidence({db:f.db,evidenceId:record.id,trust:{...f.trust,deploymentId:'00000000-0000-0000-0000-000000000000'},now});
  assert.equal(r.reason,'deployment_mismatch');
 }finally{f.sqlite.close()}
});
test('absent evidence and unsafe identifiers fail closed',async()=>{
 const f=await fixture();try{
  assert.equal((await verifyPersistedStagingEvidence({db:f.db,evidenceId:'evidence-missing-0001',trust:f.trust,now})).reason,'evidence_record_invalid');
  assert.equal((await verifyPersistedStagingEvidence({db:f.db,evidenceId:'bad',trust:f.trust,now})).reason,'invalid_evidence_id');
 }finally{f.sqlite.close()}
});
test('missing evidence schema reports unavailable not successful',async()=>{
 const db={prepare(){throw Error('missing table')}};
 const f=await fixture();try{
  const r=await verifyPersistedStagingEvidence({db,evidenceId:record.id,trust:f.trust,now});
  assert.equal(r.reason,'evidence_storage_unavailable');assert.equal(r.readinessGranted,false);
 }finally{f.sqlite.close()}
});
