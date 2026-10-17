import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { expireTaskLease, quarantineExpiredTaskLeases } from '../lib/d1-task-queue.mjs';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec("CREATE TABLE team_tasks (id TEXT PRIMARY KEY,state TEXT NOT NULL,lease_token TEXT,lease_until TEXT,blocker_reason TEXT,blocker_updated_at TEXT,updated_at TEXT);");
 const insert=sqlite.prepare("INSERT INTO team_tasks(id,state,lease_token,lease_until) VALUES (?,?,?,?)");
 insert.run('expired-1','running','lease-expired-123456','2000-01-01T00:00:00Z');
 insert.run('fresh-1','running','lease-fresh-123456','2099-01-01T00:00:00Z');
 const db={prepare(sql){return {bind(...values){return {
  first:async()=>sqlite.prepare(sql).get(...values)||null,
  all:async()=>({results:sqlite.prepare(sql).all(...values)})
 }}}}};
 return {sqlite,db};
}
test('real SQLite expiration blocks only matching expired lease and clears token',async()=>{
 const {sqlite,db}=fixture();
 try{
  assert.equal(await expireTaskLease(db,{id:'expired-1',leaseToken:'wrong-lease-token-12345'}),null);
  const result=await expireTaskLease(db,{id:'expired-1',leaseToken:'lease-expired-123456'});
  assert.equal(result.state,'blocked');
  const row=sqlite.prepare("SELECT state,lease_token,lease_until,blocker_reason FROM team_tasks WHERE id='expired-1'").get();
  assert.equal(row.state,'blocked');assert.equal(row.lease_token,null);assert.equal(row.lease_until,null);assert.equal(row.blocker_reason,'lease-expired');
  assert.equal(sqlite.prepare("SELECT state FROM team_tasks WHERE id='fresh-1'").get().state,'running');
 }finally{sqlite.close();}
});
test('real SQLite bulk recovery is bounded and quarantines expired tasks only',async()=>{
 const {sqlite,db}=fixture();
 try{
  sqlite.prepare("INSERT INTO team_tasks(id,state,lease_token,lease_until) VALUES (?,?,?,?)").run('expired-2','running','lease-expired-223456','2000-01-01T00:00:00Z');
  const result=await quarantineExpiredTaskLeases(db,{limit:1});
  assert.equal(result.recovered.length,1);
  assert.equal(result.requiresOwnerReview,true);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM team_tasks WHERE state='running' AND datetime(lease_until)<=datetime('now')").get().n,1);
  assert.equal(sqlite.prepare("SELECT state FROM team_tasks WHERE id='fresh-1'").get().state,'running');
 }finally{sqlite.close();}
});
