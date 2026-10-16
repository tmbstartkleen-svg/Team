import test from 'node:test';
import assert from 'node:assert/strict';
import {quarantineExpiredTaskLeases} from '../lib/d1-task-queue.mjs';

test('recovery is bounded and leaves tasks blocked for owner review',async()=>{
 const calls=[];
 const db={prepare(sql){return {bind(limit){calls.push({sql,limit});return {all:async()=>({results:[{id:'task-1',state:'blocked',blocker_reason:'lease-expired'}]})}}}}};
 const result=await quarantineExpiredTaskLeases(db,{limit:12});
 assert.equal(calls[0].limit,12);
 assert.match(calls[0].sql,/state='running'/);
 assert.match(calls[0].sql,/datetime\(lease_until\)<=datetime\('now'\)/);
 assert.match(calls[0].sql,/state='blocked'/);
 assert.doesNotMatch(calls[0].sql,/state='queued'/);
 assert.deepEqual(result,{recovered:[{id:'task-1',state:'blocked',reason:'lease-expired'}],requiresOwnerReview:true});
});
test('recovery rejects unsafe batch sizes and missing database',async()=>{
 for(const limit of [0,-1,101,1.5,NaN])await assert.rejects(()=>quarantineExpiredTaskLeases({prepare(){}},{limit}));
 await assert.rejects(()=>quarantineExpiredTaskLeases(null));
});
test('empty expired lease scan is idempotent',async()=>{
 const db={prepare(){return {bind(){return {all:async()=>({results:[]})}}}}};
 assert.deepEqual(await quarantineExpiredTaskLeases(db),{recovered:[],requiresOwnerReview:true});
});
