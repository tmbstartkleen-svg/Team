import test from 'node:test';
import assert from 'node:assert/strict';
import {selectReadyPersonaSteps} from '../lib/persona-step-scheduler.mjs';

// Dry-run only. This scheduler returns proposals; it performs no tool calls.
const plan=(state='queued',approved=false)=>[
 {id:'research',persona:'Researcher',state,dependsOn:[],ownerApproved:approved},
 {id:'review',persona:'Reviewer',state:'queued',dependsOn:['research'],ownerApproved:true},
 {id:'publish',persona:'Publisher',state:'queued',dependsOn:['review'],ownerApproved:true}
];
test('unapproved first persona holds entire dependent workflow',()=>{
 const x=selectReadyPersonaSteps(plan());
 assert.deepEqual(x.ready,[]);
 assert.deepEqual(x.waiting.map(s=>s.id),['research','review','publish']);
 assert.equal(x.allVerified,false);
});
test('verified upstream work cannot skip approval for a downstream persona',()=>{
 const steps=plan('verified',true);
 steps[1].ownerApproved=false;
 const x=selectReadyPersonaSteps(steps);
 assert.deepEqual(x.ready,[]);
 assert.equal(x.waiting.find(s=>s.id==='review').reason,'owner_approval_required');
});
test('blocked upstream persona cascades across subsequent scheduling rounds',()=>{
 const steps=plan('blocked',true);
 const first=selectReadyPersonaSteps(steps);
 assert.deepEqual(first.blocked.map(x=>x.id),['review']);
 steps[1].state='blocked';
 const second=selectReadyPersonaSteps(steps);
 assert.deepEqual(second.blocked.map(x=>x.id),['publish']);
 assert.deepEqual(second.ready,[]);
});
test('failed upstream step never authorizes direct dependent execution',()=>{
 const steps=plan('failed',true);
 const x=selectReadyPersonaSteps(steps);
 assert.deepEqual(x.blocked.map(s=>s.id),['review']);
 assert.deepEqual(x.ready,[]);
});
test('verified dependencies with owner approvals propose one ordered step at a time',()=>{
 const steps=plan('verified',true);
 let x=selectReadyPersonaSteps(steps);
 assert.deepEqual(x.ready.map(s=>s.id),['review']);
 steps[1].state='verified';
 x=selectReadyPersonaSteps(steps);
 assert.deepEqual(x.ready.map(s=>s.id),['publish']);
 steps[2].state='verified';
 x=selectReadyPersonaSteps(steps);
 assert.equal(x.allVerified,true);
 assert.deepEqual(x.ready,[]);
});
test('scheduler rejects unknown dependency in multi-persona plan',()=>{
 const steps=plan();
 steps[2].dependsOn=['missing'];
 assert.throws(()=>selectReadyPersonaSteps(steps),/invalid_step_dependency/);
});
