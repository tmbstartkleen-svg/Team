import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { verifyTaskWithReceipt } from '../lib/d1-execution-receipts.mjs';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE team_tasks (id TEXT PRIMARY KEY,state TEXT NOT NULL,owner_approved INTEGER NOT NULL,lease_token TEXT,lease_until TEXT,attempt_count INTEGER NOT NULL DEFAULT 1,completion_evidence TEXT,updated_at TEXT); CREATE TABLE team_execution_receipts (id TEXT PRIMARY KEY,task_id TEXT NOT NULL REFERENCES team_tasks(id),attempt_count INTEGER NOT NULL,outcome TEXT NOT NULL,evidence TEXT NOT NULL);");
 sqlite.prepare("INSERT INTO team_tasks(id,state,owner_approved,lease_token,lease_until,attempt_count) VALUES ('task1','running',1,'long-lease-token-123','2099-01-01T00:00:00Z',1)").run();
 const db={
  prepare(sql){return {bind(...values){return {sql,values}}}},
  async batch(statements){
   sqlite.exec('BEGIN');
   try{
    const results=statements.map(({sql,values})=>({results:sqlite.prepare(sql).all(...values)}));
    sqlite.exec('COMMIT');
    return results;
   }catch(error){sqlite.exec('ROLLBACK');throw error;}
  }
 };
 const input={taskId:'task1',leaseToken:'long-lease-token-123',receiptId:'receipt123456',evidence:'Analysis completed safely'};
 return {sqlite,db,input};
}
test('SQLite batch commits task verification and receipt together',async()=>{
 const {sqlite,db,input}=fixture();
 try{
  const result=await verifyTaskWithReceipt(db,input);
  assert.equal(result.recorded,true);
  assert.equal(sqlite.prepare("SELECT state FROM team_tasks WHERE id='task1'").get().state,'verified');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM team_execution_receipts').get().n,1);
 }finally{sqlite.close();}
});
test('incorrect lease causes full rollback and no receipt',async()=>{
 const {sqlite,db,input}=fixture();
 try{
  await assert.rejects(()=>verifyTaskWithReceipt(db,{...input,leaseToken:'different-lease-12345'}));
  assert.equal(sqlite.prepare("SELECT state FROM team_tasks WHERE id='task1'").get().state,'running');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM team_execution_receipts').get().n,0);
 }finally{sqlite.close();}
});
test('revoked approval cannot produce verified task or receipt',async()=>{
 const {sqlite,db,input}=fixture();
 try{
  sqlite.exec("UPDATE team_tasks SET owner_approved=0 WHERE id='task1'");
  await assert.rejects(()=>verifyTaskWithReceipt(db,input));
  assert.equal(sqlite.prepare("SELECT state FROM team_tasks WHERE id='task1'").get().state,'running');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM team_execution_receipts').get().n,0);
 }finally{sqlite.close();}
});
