import test from 'node:test';
import assert from 'node:assert/strict';
import {recordOwnerDecision} from '../lib/d1-approval-audit.mjs';
const input={taskId:'task-1',decision:'approved',reason:'Reviewed requested scope',auditId:'audit-12345678'};
test('audit is transaction-coupled and bounded to pending tasks',async()=>{
 const calls=[];
 const db={prepare(sql){return {bind(...args){calls.push({sql,args});return {sql,args}}}},batch:async statements=>{assert.equal(statements.length,2);return [{results:[{id:'task-1'}]},{results:[{id:'audit-12345678'}]}]}};
 assert.deepEqual(await recordOwnerDecision(db,input),{taskId:'task-1',decision:'approved',auditId:'audit-12345678',recorded:true});
 assert.match(calls[0].sql,/state='queued' AND owner_approved=0/);
 assert.match(calls[1].sql,/changes\(\)=1/);
});
test('missing or duplicate approvals never claim an audit receipt',async()=>{
 const db={prepare(){return {bind(){return {}}}},batch:async()=>[{results:[]},{results:[]}]};
 await assert.rejects(()=>recordOwnerDecision(db,input),/decision_not_recorded/);
});
test('invalid decisions fail before a database write',async()=>{
 await assert.rejects(()=>recordOwnerDecision(null,input),TypeError);
 await assert.rejects(()=>recordOwnerDecision({prepare(){},batch(){}},{...input,decision:'skip'}),TypeError);
});
