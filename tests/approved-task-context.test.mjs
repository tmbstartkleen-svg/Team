import test from 'node:test';
import assert from 'node:assert/strict';
import {loadApprovedTaskContext} from '../lib/approved-task-context.mjs';
import {executeApprovedPersonaTask} from '../lib/approved-persona-pipeline.mjs';
const row={id:'task_1',title:'Inspect approved project security architecture',assigned_persona:'Security Reviewer',state:'queued',owner_approved:1};
const dbFor=r=>({prepare(sql){return {bind(){return {first:async()=>sql.startsWith('SELECT')?r:{id:'task_1'},all:async()=>({results:[]})}}}},batch:async()=>[{results:[{id:'task_1'}]},{results:[{id:'receipt_12345'}]}]});
test('task context comes from owner-approved database record',async()=>{
 assert.deepEqual(await loadApprovedTaskContext(dbFor(row),'task_1'),{taskId:'task_1',taskTitle:row.title,persona:row.assigned_persona});
 assert.equal(await loadApprovedTaskContext(dbFor({...row,owner_approved:0}),'task_1'),null);
 assert.equal(await loadApprovedTaskContext(dbFor({...row,state:'running'}),'task_1'),null);
});
test('provider ignores caller supplied persona and task title',async()=>{
 let sent;const fetcher=async(_url,init)=>{sent=JSON.parse(init.body);return new Response(JSON.stringify({status:'completed',output_text:'Proposed verification steps for review.'}))};
 const result=await executeApprovedPersonaTask({db:dbFor(row),taskId:'task_1',leaseToken:'lease-token-123456789',receiptId:'receipt_12345',leaseUntil:'2099-01-01T00:00:00Z',persona:'Forged Persona',taskTitle:'Disregard the real approved task title',fetcher,apiKey:'test-key',model:'test-model'});
 assert.equal(result.ok,true);assert.equal(sent.input,row.title);assert.match(sent.instructions,/Security Reviewer/);assert.doesNotMatch(sent.instructions,/Forged Persona/);
});
