import test from 'node:test';import assert from 'node:assert/strict';import {claimApprovedTask,verifyClaimedTask} from '../lib/d1-task-queue.mjs';
const token='test-lease-token-123456';
function mock(result){const calls=[];return {calls,prepare(sql){return {bind(...args){calls.push({sql,args});return {first:async()=>result}}}}}}
test('claim only targets queued owner-approved work',async()=>{const db=mock(null);assert.equal(await claimApprovedTask(db,{id:'t1',leaseToken:token,leaseUntil:'2026-10-15T20:00:00Z'}),null);assert.match(db.calls[0].sql,/state='queued' AND owner_approved=1/);assert.equal(db.calls[0].args[2],'t1')});
test('completion requires matching lease and evidence',async()=>{const db=mock(null);assert.equal(await verifyClaimedTask(db,{id:'t1',leaseToken:token,evidence:'Test evidence summary'}),null);assert.match(db.calls[0].sql,/state='running' AND lease_token=\?/);await assert.rejects(()=>verifyClaimedTask(db,{id:'t1',leaseToken:token,evidence:'none'}))});
test('short lease token rejected',async()=>{await assert.rejects(()=>claimApprovedTask(mock(null),{id:'t1',leaseToken:'short',leaseUntil:'2026-10-15T20:00:00Z'}))});
