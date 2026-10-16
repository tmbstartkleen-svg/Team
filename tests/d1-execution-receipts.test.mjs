import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyTaskWithReceipt} from '../lib/d1-execution-receipts.mjs';
const input={taskId:'task_1',leaseToken:'lease-token-123456',receiptId:'receipt-123456',evidence:'Completion independently verified'};
test('verification and receipt share one bounded D1 transaction',async()=>{
 const calls=[];
 const db={prepare(sql){return {bind(...args){calls.push({sql,args});return {sql,args}}}},batch:async()=>[{results:[{id:'task_1'}]},{results:[{id:'receipt-123456'}]}]};
 assert.equal((await verifyTaskWithReceipt(db,input)).recorded,true);
 assert.match(calls[0].sql,/state='running' AND lease_token=\?/);
 assert.match(calls[0].sql,/datetime\(lease_until\)>datetime\('now'\)/);
 assert.match(calls[1].sql,/changes\(\)=1/);
});
test('missing lease or receipt fails closed',async()=>{
 const db={prepare(){return {bind(){return {}}}},batch:async()=>[{results:[]},{results:[]}]};
 await assert.rejects(()=>verifyTaskWithReceipt(db,input),/verification_not_recorded/);
 await assert.rejects(()=>verifyTaskWithReceipt(db,{...input,leaseToken:'short'}),TypeError);
});
