import test from 'node:test';
import assert from 'node:assert/strict';
import {planWorkforceTask} from '../lib/workforce-plan.mjs';
test('routes a normal software task to the right specialist without execution',()=>{
 const r=planWorkforceTask({title:'Fix backend software bug',priority:'high'});
 assert.equal(r.lead,'Software Engineer');
 assert.equal(r.execution,'not-started');assert.equal(r.taskWrites,0);
 assert.equal(r.networkCalls,0);assert.equal(r.modelCalls,0);
 assert.equal(r.steps.at(-1).status,'blocked');
});
test('sensitive operations require a dedicated security review',()=>{
 const r=planWorkforceTask({title:'Deploy production release'});
 assert.equal(r.risk,'sensitive');
 assert.ok(r.steps.some(x=>x.id==='security'));
 assert.equal(r.productionTouched,false);
});
test('unknown specialists and invalid requests fail closed',()=>{
 for(const input of [{title:'X'},{title:'A valid task',persona:'Imaginary Specialist'},{title:'Build UI',priority:'urgent'},null]){
 assert.throws(()=>planWorkforceTask(input));
 }
});
test('planning never claims autonomous agents, approvals, or model invocations',()=>{
 const r=planWorkforceTask({title:'Approve a payment and send an email'});
 assert.equal(r.agentExecutionEnabled,false);
 assert.equal(r.approval,'required');
 assert.equal(r.externalActions,0);
 assert.equal(r.steps.at(-1).status,'blocked');
});
