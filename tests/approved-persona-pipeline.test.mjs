import test from 'node:test';
import assert from 'node:assert/strict';
import {executeApprovedPersonaTask} from '../lib/approved-persona-pipeline.mjs';
const args={taskId:'task-1',leaseToken:'lease-123456789012345',receiptId:'receipt-123456789',leaseUntil:'2099-01-01T00:00:00Z',persona:'QA Engineer',taskTitle:'Review all task lease recovery safeguards',apiKey:'test-key',model:'gpt-test'};
function database({claim=true,receipt=true}={}){
 const calls=[];
 return {calls,prepare(sql){return {bind(...params){calls.push({sql,params});return {first:async()=>sql.startsWith('SELECT id,title,assigned_persona')?{id:args.taskId,title:args.taskTitle,assigned_persona:args.persona,state:'queued',owner_approved:claim?1:0}:sql.includes('owner_approved=1')?(claim?{id:args.taskId}:null):{id:args.taskId},all:async()=>({results:[]})}}}},batch:async()=>receipt?[{results:[{id:args.taskId}]},{results:[{id:args.receiptId}]}]:[{results:[]},{results:[]}]};
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

test('Cloudflare Workers AI executes an owner-approved queued task and records receipt',async()=>{
 const db=database();let calls=0;
 const result=await executeApprovedPersonaTask({...args,db,provider:'cloudflare',ai:{run:async(model,payload)=>{
  calls++;assert.equal(model,'@cf/zai-org/glm-4.7-flash');
  assert.equal(payload.messages[1].content,args.taskTitle);
  return {response:'Review the lease-recovery tests and log any remaining issues.'};
 }}});
 assert.equal(calls,1);
 assert.equal(result.ok,true);
 assert.equal(result.state,'verified');
 assert.equal(result.receiptId,args.receiptId);
 assert.equal(result.externalActionsPerformed,false);
 assert.ok(db.calls.some(x=>x.sql.includes('team_execution_receipts')));
});
test('unapproved Cloudflare task cannot invoke model or insert a receipt',async()=>{
 const db=database({claim:false});let calls=0;
 const result=await executeApprovedPersonaTask({...args,db,provider:'cloudflare',ai:{run:async()=>{calls++;return {response:'no'};}}});
 assert.equal(result.ok,false);
 assert.equal(calls,0);
 assert.ok(!db.calls.some(x=>x.sql.includes('team_execution_receipts')));
});
test('Cloudflare model failure blocks claimed task without recording receipt',async()=>{
 const db=database();let calls=0;
 const result=await executeApprovedPersonaTask({...args,db,provider:'cloudflare',ai:{run:async()=>{calls++;throw Error('inference_unavailable')}}});
 assert.equal(calls,1);
 assert.equal(result.ok,false);
 assert.equal(result.state,'blocked');
 assert.equal(result.failureStage,'provider');
 assert.ok(db.calls.some(x=>x.sql.includes("blocker_reason=?")));
 assert.ok(!db.calls.some(x=>x.sql.includes('team_execution_receipts')));
});
test('receipt rejection never returns success for Cloudflare task',async()=>{
 const db=database({receipt:false});
 const result=await executeApprovedPersonaTask({...args,db,provider:'cloudflare',ai:{run:async()=>({response:'Analysis completed for owner review.'})}});
 assert.equal(result.ok,false);
 assert.equal(result.state,'blocked');
 assert.equal(result.failureStage,'receipt');
 assert.ok(db.calls.some(x=>x.sql.includes("blocker_reason=?")));
});

test('unknown inference provider fails before claiming or contacting any model',async()=>{
 const db=database();let called=false;
 await assert.rejects(()=>executeApprovedPersonaTask({...args,db,provider:'unapproved-provider',fetcher:async()=>{called=true;throw Error('unexpected')}}),/invalid_inference_provider/);
 assert.equal(db.calls.length,0);assert.equal(called,false);
});
