import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../migrations/0010_release_evidence_events.sql',import.meta.url),'utf8');
test('release evidence migration is storage only and append-only',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS team_release_evidence_events/);
 assert.match(sql,/BEFORE UPDATE ON team_release_evidence_events/);
 assert.match(sql,/BEFORE DELETE ON team_release_evidence_events/);
 assert.match(sql,/CHECK\(verdict IN \('verified','rejected','revoked'\)\)/);
 assert.match(sql,/supersedes_event_id TEXT REFERENCES team_release_evidence_events\(id\)/);
 assert.doesNotMatch(sql,/CREATE\s+(?:TRIGGER|TABLE)[^;]*TEAM_TOOL_EXECUTOR_ENABLED/i);
});
test('requires source identity, digest, environment and method',()=>{
 for(const field of ['issuer','source_family','artifact_ref','artifact_sha256','environment','deployment_commit','verification_method','event_time'])assert.match(sql,new RegExp('\\b'+field+' TEXT NOT NULL'));
});

import {DatabaseSync} from 'node:sqlite';
function setup(){
 const db=new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON;'+sql);
 return db;
}
function event(id='event-001',overrides={}){
 return {id,requirement_key:'monitoring',issuer:'trusted-monitor',source_family:'cloudflare-logs',artifact_ref:'cloudflare://run/123456',artifact_sha256:'a'.repeat(64),environment:'staging',deployment_commit:'b'.repeat(40),verification_method:'independent-api-verification',verdict:'verified',supersedes_event_id:null,event_time:'2026-10-21T00:00:00Z',...overrides};
}
const fields=['id','requirement_key','issuer','source_family','artifact_ref','artifact_sha256','environment','deployment_commit','verification_method','verdict','supersedes_event_id','event_time'];
function insert(db,row){
 return db.prepare('INSERT INTO team_release_evidence_events ('+fields.join(',')+') VALUES ('+fields.map(()=>'?').join(',')+')').run(...fields.map(k=>row[k]));
}
test('SQLite migration creates table and protects existing evidence',()=>{
 const db=setup();
 try{
  insert(db,event());
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM team_release_evidence_events').get().n,1);
  assert.throws(()=>db.prepare("UPDATE team_release_evidence_events SET verdict='rejected' WHERE id='event-001'").run(),/release_evidence_immutable/);
  assert.throws(()=>db.prepare("DELETE FROM team_release_evidence_events WHERE id='event-001'").run(),/release_evidence_immutable/);
 }finally{db.close()}
});
test('SQLite constraints reject malformed, duplicate, and unsupported records',()=>{
 const db=setup();
 try{
  insert(db,event());
  for(const [n,change] of Object.entries({
   unknownRequirement:{requirement_key:'untrusted-gate'},
   invalidDigest:{artifact_sha256:'invalid'},
   invalidEnvironment:{environment:'development'},
   invalidVerdict:{verdict:'pending'},
   absentIssuer:{issuer:''},
   duplicateArtifact:{}
  }))assert.throws(()=>insert(db,event('event-'+n,change)),/constraint/i,n);
 }finally{db.close()}
});
test('SQLite supports immutable revocation referencing a prior event',()=>{
 const db=setup();
 try{
  insert(db,event());
  insert(db,event('event-revoked',{verdict:'revoked',artifact_sha256:'c'.repeat(64),supersedes_event_id:'event-001'}));
  assert.equal(db.prepare("SELECT supersedes_event_id FROM team_release_evidence_events WHERE id='event-revoked'").get().supersedes_event_id,'event-001');
  assert.throws(()=>insert(db,event('event-bad-ref',{artifact_sha256:'d'.repeat(64),supersedes_event_id:'not-found'})),/invalid_release_evidence_supersession|constraint/i);
 }finally{db.close()}
});

test('SQLite rejects cross-requirement and cross-environment revocations',()=>{
 const db=setup();
 try{
  insert(db,event());
  assert.throws(()=>insert(db,event('bad-scope',{requirement_key:'rollback',verdict:'revoked',artifact_sha256:'e'.repeat(64),supersedes_event_id:'event-001'})),/invalid_release_evidence_supersession/);
  assert.throws(()=>insert(db,event('bad-environment',{environment:'production',verdict:'revoked',artifact_sha256:'f'.repeat(64),supersedes_event_id:'event-001'})),/invalid_release_evidence_supersession/);
  assert.throws(()=>insert(db,event('bad-verdict',{verdict:'verified',artifact_sha256:'1'.repeat(64),supersedes_event_id:'event-001'})),/invalid_release_evidence_supersession/);
 }finally{db.close()}
});

test('SQLite revocations must identify one target and cannot revoke it twice',()=>{
 const db=setup();
 try{
  insert(db,event());
  assert.throws(()=>insert(db,event('rev-without-target',{verdict:'revoked',artifact_sha256:'2'.repeat(64)})),/release_evidence_revocation_target_required/);
  insert(db,event('rev-first',{verdict:'revoked',artifact_sha256:'3'.repeat(64),supersedes_event_id:'event-001'}));
  assert.throws(()=>insert(db,event('rev-second',{verdict:'revoked',artifact_sha256:'4'.repeat(64),supersedes_event_id:'event-001'})),/constraint/i);
 }finally{db.close()}
});
