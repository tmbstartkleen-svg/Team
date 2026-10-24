import test from 'node:test';
import assert from 'node:assert/strict';
import {buildWorkforceSimulation,reviewWorkforceSimulation} from '../lib/workforce-simulation.mjs';
import {workforceCapabilityMatrix} from '../lib/workforce-capability-matrix.mjs';
test('all personas remain profiles until an approved real runtime exists',()=>{
 const m=workforceCapabilityMatrix();
 assert.equal(m.personas.length,18);assert.equal(m.onlineAgentCount,0);
 assert.ok(m.personas.every(p=>p.canExecute===false&&p.requiresHumanApproval&&p.activeModel===null));
});
test('dependency graph is deterministic and never executes',()=>{
 const input={title:'Fix backend software bug'};
 const a=buildWorkforceSimulation(input),b=buildWorkforceSimulation(input);
 assert.deepEqual(a,b);assert.equal(a.mode,'dry-run');assert.equal(a.networkCalls,0);
 assert.equal(a.nodes.at(-1).state,'blocked');
 assert.equal(a.nodes.at(-1).id,'approval');
 for(let i=1;i<a.nodes.length;i++)assert.deepEqual(a.nodes[i].dependsOn,[a.nodes[i-1].id]);
});
test('completed steps are only review markers, never approval or execution',()=>{
 const sim=buildWorkforceSimulation({title:'Build a report'});
 const review=reviewWorkforceSimulation(sim,['intake','research']);
 assert.equal(review.nodes[0].state,'review-ready');
 assert.equal(review.nodes.at(-1).state,'blocked');
 assert.equal(review.execution,'disabled');
 assert.throws(()=>reviewWorkforceSimulation(sim,['research']),/dependency_not_satisfied/);
 assert.throws(()=>reviewWorkforceSimulation(sim,['approval']),/invalid_completed_steps/);
});
test('sensitive work inserts security review and cannot bypass gate',()=>{
 const sim=buildWorkforceSimulation({title:'Deploy production release'});
 assert.ok(sim.nodes.some(n=>n.id==='security'));
 assert.equal(sim.productionTouched,false);
});
