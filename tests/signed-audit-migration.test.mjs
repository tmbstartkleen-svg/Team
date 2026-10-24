import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const ddl=readFileSync(new URL('../migrations/0011_signed_audit_events.sql',import.meta.url),'utf8');
const row=(id='audit-record-001')=>({id,kind:'owner-authenticated-approval',task:'safe-task-001',step:'safe-step-001',key:'safe-key-001',issuer:'audit-signer-001',event:'{"kind":"owner-authenticated-approval","taskId":"safe-task-001"}',signature:'a'.repeat(86)});
test('immutable scoped audit table rejects mutation and conflicting attestation',()=>{
 const db=new DatabaseSync(':memory:');
 try{
  db.exec(ddl);
  const r=row();
  const insert=db.prepare('INSERT INTO team_signed_audit_events(id,kind,task_id,step_id,idempotency_key,issuer,event_json,signature) VALUES(?,?,?,?,?,?,?,?)');
  insert.run(r.id,r.kind,r.task,r.step,r.key,r.issuer,r.event,r.signature);
  assert.throws(()=>db.exec("UPDATE team_signed_audit_events SET issuer='other' WHERE id='audit-record-001'"),/signed_audit_immutable/);
  assert.throws(()=>db.exec("DELETE FROM team_signed_audit_events WHERE id='audit-record-001'"),/signed_audit_immutable/);
  assert.throws(()=>insert.run('other-id',r.kind,r.task,r.step,r.key,r.issuer,r.event,r.signature),/constraint/i);
  assert.throws(()=>insert.run('third-id','unsupported',r.task,r.step,'another-key',r.issuer,r.event,r.signature),/constraint/i);
 }finally{db.close()}
});
