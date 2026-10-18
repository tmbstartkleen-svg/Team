import test from 'node:test';import assert from 'node:assert/strict';
import {loadPersistedToolGrant} from '../lib/d1-tool-step-grants.mjs';
const opts={taskId:'task-12345',stepId:'step-12345'};
const row={task_id:opts.taskId,step_id:opts.stepId,persona:'QA-Engineer',assigned_persona:'QA-Engineer',tool:'github.read',capability:'read',target_json:'{"owner":"example","repo":"team","resource":"repository"}',idempotency_key:'action-12345',confirmation:0,owner_approved:1,state:'queued'};
function db(value){return {prepare(sql){assert.match(sql,/g.enabled=1/);return {bind(){return {first:async()=>value}}}}}}
test('only approved queued persisted grants can authorize a tool',async()=>{const g=await loadPersistedToolGrant(db(row),opts);assert.equal(g.ownerApproved,true);assert.deepEqual(g.approval.allowedTools,['github.read']);assert.equal(g.step.target.repo,'team')});
test('unapproved task fails closed',async()=>assert.equal(await loadPersistedToolGrant(db({...row,owner_approved:0}),opts),null));
test('wrong persona fails closed',async()=>assert.equal(await loadPersistedToolGrant(db({...row,assigned_persona:'Other'}),opts),null));
test('invalid target fails closed',async()=>assert.equal(await loadPersistedToolGrant(db({...row,target_json:'broken'}),opts),null));
test('nonqueued task fails closed',async()=>assert.equal(await loadPersistedToolGrant(db({...row,state:'verified'}),opts),null));
