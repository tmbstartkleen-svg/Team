import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const ddl=readFileSync(new URL('../migrations/0012_origin_observations.sql',import.meta.url),'utf8');
function create(){
 const db=new DatabaseSync(':memory:');
 db.exec(ddl);
 return db;
}
const sample=(overrides={})=>({
 event_id:'origin-event-001',source_id:'source-independent-001',issuer:'upstream-issuer-001',
 kind:'owner-authenticated-approval',task_id:'safe-new-task-001',step_id:'safe-step-001',
 idempotency_key:'safe-key-001',event_json:JSON.stringify({kind:'owner-authenticated-approval',taskId:'safe-new-task-001'}),
 signature:'a'.repeat(86),...overrides
});
function insert(db,e){
 return db.prepare('INSERT INTO team_origin_observations(event_id,source_id,issuer,kind,task_id,step_id,idempotency_key,event_json,signature) VALUES(?,?,?,?,?,?,?,?,?)')
  .run(e.event_id,e.source_id,e.issuer,e.kind,e.task_id,e.step_id,e.idempotency_key,e.event_json,e.signature);
}
test('origin observations enforce append-only records',()=>{
 const db=create();
 try{
  insert(db,sample());
  assert.throws(()=>db.exec("UPDATE team_origin_observations SET issuer='altered' WHERE event_id='origin-event-001'"),/origin_immutable/);
  assert.throws(()=>db.exec("DELETE FROM team_origin_observations WHERE event_id='origin-event-001'"),/origin_immutable/);
 }finally{db.close()}
});
test('origin observations reject duplicate scope, malformed signature, and unknown kind',()=>{
 const db=create();
 try{
  insert(db,sample());
  assert.throws(()=>insert(db,sample({event_id:'origin-event-002'})),/constraint/i);
  assert.throws(()=>insert(db,sample({event_id:'origin-event-003',idempotency_key:'safe-key-003',signature:'invalid'})),/constraint/i);
  assert.throws(()=>insert(db,sample({event_id:'origin-event-004',idempotency_key:'safe-key-004',kind:'caller-approved'})),/constraint/i);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM team_origin_observations').get().n,1);
 }finally{db.close()}
});
