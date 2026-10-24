import test from 'node:test';
import assert from 'node:assert/strict';
import {createD1ExecutionInspectors} from '../lib/d1-execution-inspectors.mjs';
const scope={taskId:'safe-task-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123',receiptId:'receipt-123'};
const db={prepare(sql){return {bind(...args){return {first:async()=>{
 if(sql.includes('FROM team_tasks'))return {task_id:scope.taskId,step_id:scope.stepId,state:'verified',tool:'github.read',idempotency_key:scope.idempotencyKey};
 if(sql.includes('JOIN team_tool_step_grants'))return {task_id:scope.taskId,step_id:scope.stepId,state:'confirmed',receipt_id:scope.receiptId,evidence:'durable-evidence',tool:'github.read'};
 return {task_id:scope.taskId,step_id:scope.stepId,state:'confirmed',receipt_id:scope.receiptId,created_at:'2026-10-21 19:30:00'};
 }}}}}};
test('D1 inspectors expose only persisted task and receipt projections',async()=>{
 const i=createD1ExecutionInspectors(db);
 assert.equal((await i.inspectLedger(scope)).state,'confirmed');
 assert.equal((await i.inspectLedger(scope)).reservedAt,'2026-10-21 19:30:00');
 assert.equal((await i.inspectReceipt(scope)).durable,true);
 assert.equal((await i.inspectTask(scope)).tool,'github.read');
 assert.deepEqual(Object.keys(i).sort(),['inspectLedger','inspectReceipt','inspectTask']);
});
test('read-only D1 cannot manufacture owner approval or replay denial',async()=>{
 const i=createD1ExecutionInspectors(db);
 assert.equal(i.inspectApproval,undefined);
 assert.equal(i.inspectReplayDenial,undefined);
});
test('mismatched receipt and database outage fail closed',async()=>{
 const i=createD1ExecutionInspectors(db);
 assert.deepEqual(await i.inspectReceipt({...scope,receiptId:'other-receipt'}),{});
 const offline=createD1ExecutionInspectors({prepare(){throw Error('offline')}});
 assert.deepEqual(await offline.inspectLedger(scope),{});
});
