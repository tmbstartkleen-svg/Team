import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverInterruptedTask} from '../lib/task-recovery.mjs';
const now=Date.parse('2026-10-20T12:00:00Z');
const task=(time)=>({id:'job-1',state:'running',lastHeartbeat:new Date(time).toISOString()});
test('implausibly future heartbeat fails closed instead of holding lease forever',()=>{
 assert.throws(()=>recoverInterruptedTask(task(now+3600000),{now}),/invalid_lease/);
});
test('small clock skew does not falsely expire the lease',()=>{
 const r=recoverInterruptedTask(task(now+30000),{now});
 assert.equal(r.action,'none');
});
test('expired lease remains blocked for reconciliation and owner approval',()=>{
 const r=recoverInterruptedTask(task(now-360000),{now,leaseMs:300000});
 assert.equal(r.action,'pause-for-review');
 assert.equal(r.requiresOwnerApproval,true);
 assert.equal(r.task.state,'blocked');
});
