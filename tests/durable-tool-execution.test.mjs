import test from 'node:test';
import assert from 'node:assert/strict';
import {executeDurableToolStep} from '../lib/durable-tool-execution.mjs';
const step={persona:'QA-Engineer',tool:'team.read',capability:'read',idempotencyKey:'unique-action-123'};
const approval={taskApproved:true,allowedTools:['team.read'],grantedCapabilities:['read']};
function db() {
 const map = new Map();
 return {
  prepare(sql) {
   return {
    bind(...x) {
     return {
      async run() {
       if (sql.startsWith('INSERT')) {
        if (map.has(x[0])) return {meta:{changes:0}};
        map.set(x[0],{task_id:x[1],step_id:x[2],state:'reserved'});
        return {meta:{changes:1}};
       }
       const record=map.get(x[3]);
       if (!record || record.state!=='reserved' || record.task_id!==x[4] || record.step_id!==x[5]) return {meta:{changes:0}};
       record.state=x[0];
       return {meta:{changes:1}};
      },
      async first(){return map.get(x[0])||null;}
     };
    }
   };
  }
 };
}
const input={taskId:'task-12345',stepId:'step-12345',step,approval};
test('persists confirmed action before reporting success and denies replay',async()=>{let count=0;const d=db(),adapters={'team.read':async()=>{count++;return {confirmed:true,receiptId:'receipt-12345',evidence:'Verified repository read outcome'}}};const a=await executeDurableToolStep({...input,db:d,adapters});const b=await executeDurableToolStep({...input,db:d,adapters});assert.equal(a.status,'verified');assert.equal(a.durable,true);assert.equal(b.executed,false);assert.equal(count,1)});
test('unapproved action never reserves or calls adapter',async()=>{let called=false;const r=await executeDurableToolStep({...input,db:db(),approval:{...approval,taskApproved:false},adapters:{'team.read':async()=>{called=true}}});assert.equal(r.status,'denied');assert.equal(called,false)});
test('missing adapter fails to reconciliation and does not replay',async()=>{const d=db();const a=await executeDurableToolStep({...input,db:d,adapters:{}});const b=await executeDurableToolStep({...input,db:d,adapters:{}});assert.equal(a.status,'needs-reconciliation');assert.equal(b.executed,false)});
