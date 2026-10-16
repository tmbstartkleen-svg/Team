import test from 'node:test';
import assert from 'node:assert/strict';
import {executeApprovedPersonaTask} from '../lib/approved-persona-pipeline.mjs';
const args={taskId:'task-1',leaseToken:'lease-123456789012345',receiptId:'receipt-123456789',leaseUntil:'2099-01-01T00:00:00Z',persona:'QA Engineer',taskTitle:'Review all task lease recovery safeguards',apiKey:'test-key',model:'gpt-test'};
function database({claim=true,receipt=true}={}){
 const calls=[];
 return {calls,prepare(sql){return {bind(...params){calls.push({sql,params});return {first:async()=>sql.includes('owner_approved=1')?(claim?{id:args.taskId}:null):{id:args.taskId},all:async()=>({results:[]})}}}},batch:async()=>receipt?[{results:[{id:args.taskId}]},{results:[{id:args.receiptId}]}]:[{results:[]},{results:[]}]};
}
test('never calls provider without an approved queued task claim',async()=>{
 let called=false;const db=database({claim:false});
 const r=await executeApprovedPersonaTask({...args,db,fetcher:async()=>{called=true;throw Error('should not run')}});
 assert.equal(r.ok,false);assert.equal(called,false);
});
test('approved analysis produces a receipt without claiming external actions',async()=>{
 const db=database();
 const r=await executeApprovedPersonaTask({...args,db,fetcher:async()=>new Response(JSON.stringify({status:'completed',id:'req-123',output_text:'Review complete with proposed tests.'}),{status:200})});
 assert.equal(r.ok,true);assert.equal(r.outputType,'analysis-only');assert.equal(r.externalActionsPerformed,false);
 assert.ok(db.calls.some(x=>x.sql.includes('team_execution_receipts')));
});
test('provider failures block claimed tasks and never claim verified work',async()=>{
 const db=database();
 const r=await executeApprovedPersonaTask({...args,db,fetcher:async()=>new Response('{}',{status:500})});
 assert.equal(r.ok,false);assert.equal(r.state,'blocked');
 assert.ok(db.calls.some(x=>x.sql.includes("blocker_reason=?")));
});
test('invalid executor identity fails before task claim',async()=>{
 const db=database();
 await assert.rejects(()=>executeApprovedPersonaTask({...args,db,leaseToken:'short',fetcher:async()=>new Response('{}')}),TypeError);
 assert.equal(db.calls.length,0);
});
