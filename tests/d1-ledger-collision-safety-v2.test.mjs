import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveToolAction,recordToolActionOutcome} from '../lib/d1-tool-action-ledger.mjs';

const key='cert-github-read-20261019-v2-once';
const base={taskId:'cert-github-read-20261019-v2',stepId:'cert-github-repository-read',idempotencyKey:key};
function duplicateDb(existing){
 let writes=0,reads=0;
 return {
  get writes(){return writes},get reads(){return reads},
  prepare(sql){
   if(sql.startsWith('INSERT OR IGNORE'))return {bind(){return {run:async()=>{writes++;return {meta:{changes:0}}}}}};
   if(sql.startsWith('SELECT task_id'))return {bind(){return {first:async()=>{reads++;return existing}}}};
   throw Error('unexpected SQL');
  }
 };
}
test('existing key belonging to another task denies reservation as collision',async()=>{
 const db=duplicateDb({task_id:'different-task-id',step_id:base.stepId,state:'confirmed'});
 const x=await reserveToolAction(db,base);
 assert.deepEqual(x,{reserved:false,status:'collision'});
 assert.equal(db.writes,1);assert.equal(db.reads,1);
});
test('existing matching key remains non-reservable after confirmation',async()=>{
 const db=duplicateDb({task_id:base.taskId,step_id:base.stepId,state:'confirmed'});
 assert.deepEqual(await reserveToolAction(db,base),{reserved:false,status:'confirmed'});
});
test('unknown existing state fails closed to reconciliation',async()=>{
 const db=duplicateDb({task_id:base.taskId,step_id:base.stepId,state:'unrecognized'});
 assert.deepEqual(await reserveToolAction(db,base),{reserved:false,status:'needs-reconciliation'});
});
test('missing row after ignored insert fails closed',async()=>{
 const db=duplicateDb(null);
 assert.deepEqual(await reserveToolAction(db,base),{reserved:false,status:'needs-reconciliation'});
});
test('receipt cannot be confirmed without validated evidence',async()=>{
 let writes=0;
 const db={prepare(){writes++;throw Error('unexpected write')}};
 await assert.rejects(recordToolActionOutcome(db,{...base,confirmed:true,receiptId:'receipt-1234',evidence:'short'}),/invalid_action_receipt/);
 assert.equal(writes,0);
});
