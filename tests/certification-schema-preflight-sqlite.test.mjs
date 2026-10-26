import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {inspectCertificationSchemaPreflight} from '../lib/certification-schema-preflight.mjs';
function fixture({removeTrigger=false,existingDraft=false,violatedForeignKey=false}={}){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE team_tasks(id TEXT PRIMARY KEY,state TEXT,owner_approved INTEGER,lease_token TEXT,lease_until TEXT,attempt_count INTEGER,completion_evidence TEXT);
 CREATE TABLE team_approval_audit(id TEXT PRIMARY KEY,task_id TEXT REFERENCES team_tasks(id));
 CREATE TABLE team_execution_receipts(id TEXT PRIMARY KEY,task_id TEXT REFERENCES team_tasks(id));
 CREATE TRIGGER team_approval_audit_no_update BEFORE UPDATE ON team_approval_audit BEGIN SELECT RAISE(ABORT,'immutable'); END;
 CREATE TRIGGER team_approval_audit_no_delete BEFORE DELETE ON team_approval_audit BEGIN SELECT RAISE(ABORT,'immutable'); END;
 CREATE TRIGGER team_execution_receipts_no_update BEFORE UPDATE ON team_execution_receipts BEGIN SELECT RAISE(ABORT,'immutable'); END;
 CREATE TRIGGER team_execution_receipts_no_delete BEFORE DELETE ON team_execution_receipts BEGIN SELECT RAISE(ABORT,'immutable'); END;`);
 if(removeTrigger)sqlite.exec('DROP TRIGGER team_execution_receipts_no_delete');
 if(existingDraft)sqlite.exec(readFileSync(new URL('../design/staging-certification-evidence-schema.draft.sql',import.meta.url),'utf8'));
 if(violatedForeignKey){sqlite.exec('PRAGMA foreign_keys=OFF');sqlite.exec("INSERT INTO team_approval_audit VALUES ('audit-1','missing-task')");}
 const db={prepare(sql){return {all:async()=>({results:sqlite.prepare(sql).all()})}}};
 return {db,sqlite};
}
test('legacy schema passes review eligibility without authorizing migration',async()=>{
 const f=fixture();try{
  const r=await inspectCertificationSchemaPreflight(f.db);
  assert.equal(r.ok,true);assert.equal(r.eligibleForReview,true);
  assert.equal(r.migrationApplied,false);assert.equal(r.ownerAuthorizationRequired,true);
 }finally{f.sqlite.close()}
});
test('missing immutable legacy trigger blocks migration review',async()=>{
 const f=fixture({removeTrigger:true});try{
  const r=await inspectCertificationSchemaPreflight(f.db);
  assert.equal(r.reason,'legacy_prerequisites_missing');
  assert.ok(r.missing.includes('trigger:team_execution_receipts_no_delete'));
 }finally{f.sqlite.close()}
});
test('existing draft schema prevents blind reapplication',async()=>{
 const f=fixture({existingDraft:true});try{
  const r=await inspectCertificationSchemaPreflight(f.db);
  assert.equal(r.reason,'evidence_schema_already_present');assert.equal(r.migrationApplied,false);
 }finally{f.sqlite.close()}
});
test('foreign-key violations block review',async()=>{
 const f=fixture({violatedForeignKey:true});try{
  const r=await inspectCertificationSchemaPreflight(f.db);
  assert.equal(r.reason,'foreign_key_integrity_failed');
 }finally{f.sqlite.close()}
});
test('unavailable D1 fails closed',async()=>{
 assert.equal((await inspectCertificationSchemaPreflight(null)).reason,'database_not_bound');
 assert.equal((await inspectCertificationSchemaPreflight({prepare(){throw Error('offline')}})).reason,'database_preflight_failed');
});
test('draft revocation table guarantees unique and append-only revocation records',()=>{
 const f=fixture({existingDraft:true});try{
  f.sqlite.prepare("INSERT INTO team_tasks (id,state,owner_approved,attempt_count) VALUES ('task-0001','verified',1,1)").run();
  f.sqlite.prepare("INSERT INTO team_certification_evidence (id,task_id,gate,envelope_json,envelope_sha256) VALUES (?,?,?,?,?)")
   .run('evidence-0001','task-0001','approved-agent-execution','{}','a'.repeat(64));
  f.sqlite.prepare('INSERT INTO team_certification_revocations (id,evidence_id,reason) VALUES (?,?,?)')
   .run('revoke-0001','evidence-0001','revoked by owner');
  assert.throws(()=>f.sqlite.prepare('INSERT INTO team_certification_revocations (id,evidence_id,reason) VALUES (?,?,?)')
   .run('revoke-0002','evidence-0001','duplicate'),/UNIQUE constraint failed/);
  assert.throws(()=>f.sqlite.prepare('UPDATE team_certification_revocations SET reason=? WHERE id=?')
   .run('changed','revoke-0001'),/immutable_certification_revocation/);
 }finally{f.sqlite.close()}
});
