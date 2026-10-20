import test from 'node:test';
import assert from 'node:assert/strict';
import {selectReadyPersonaSteps} from '../lib/persona-step-scheduler.mjs';
const base={id:'review',persona:'Reviewer',state:'queued',ownerApproved:true,dependsOn:[]};
test('duplicate dependency IDs rejected instead of silently double-counted',()=>{
 const steps=[{...base,id:'research',persona:'Researcher',state:'verified'},
 {...base,dependsOn:['research','research']}];
 assert.throws(()=>selectReadyPersonaSteps(steps),/invalid_persona_step/);
});
test('independent prerequisites still schedule once both verified',()=>{
 const steps=[{...base,id:'research',persona:'Researcher',state:'verified'},
 {...base,id:'qa',persona:'QA',state:'verified'},
 {...base,dependsOn:['research','qa']}];
 assert.deepEqual(selectReadyPersonaSteps(steps).ready,[{id:'review',persona:'Reviewer'}]);
});
