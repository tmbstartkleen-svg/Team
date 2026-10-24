import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const ddl=readFileSync(new URL('../migrations/0011_signed_audit_events.sql',import.meta.url),'utf8');
function insert(db,overrides={}){
 const row={id:'event-001',kind:'owner-authenticated-approval',task_id:'safe-task-001',step_id:'step-001',idempotency_key:'key-001',issuer:'trusted-issuer',event_json:JSON.stringify({kind:'owner-authenticated-approval',taskId:'safe-task-001'}),signature:'a'.repeat(86),...overrides};
 return db.prepare('INSERT INTO team_signed_audit_events(id,kind,task_id,step_id,idempotency_key,issuer,event_json,signature) VALUES (?,?,?,?,?,?,?,?)').run(...['id','kind','task_id','step_id','idempotency_key','issuer','event_json','signature'].map(k=>row[k]));
}
test('signed audit migration rejects malformed signatures and duplicate event IDs',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(ddl); insert(db);
  assert.throws(()=>insert(db,{id:'event-002',idempotency_key:'key-002',signature:'bad'}),/constraint/i);
  assert.throws(()=>insert(db,{id:'event-003',idempotency_key:'key-003',signature:'+'.repeat(86)}),/constraint/i);
  assert.throws(()=>insert(db,{id:'event-001',idempotency_key:'key-004'}),/constraint/i);
  assert.equal(db.prepare('SELECT count(*) AS n FROM team_signed_audit_events').get().n,1);
 }finally{db.close()}
});
test('signed audit migration distinguishes event kinds and enforces scoped uniqueness',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(ddl);insert(db);
  insert(db,{id:'event-002',kind:'observed-replay-denial'});
  assert.throws(()=>insert(db,{id:'event-003',kind:'observed-replay-denial'}),/constraint/i);
  assert.throws(()=>insert(db,{id:'event-004',kind:'caller-approved',idempotency_key:'key-004'}),/constraint/i);
  assert.equal(db.prepare('SELECT count(*) AS n FROM team_signed_audit_events').get().n,2);
 }finally{db.close()}
});
