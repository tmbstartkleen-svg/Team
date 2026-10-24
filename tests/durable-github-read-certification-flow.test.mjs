import test from 'node:test';
import assert from 'node:assert/strict';
import {executeDurableToolStep} from '../lib/durable-tool-execution.mjs';

const input={
 taskId:'staging-cert-task-20261024-a1',
 stepId:'staging-cert-step-20261024-a1',
 step:{persona:'release-review',tool:'github.read',capability:'read',idempotencyKey:'staging-cert-once-20261024',target:{owner:'tmbstartkleen-svg',repo:'Team',resource:'repository'}},
 approval:{taskApproved:true,allowedTools:['github.read'],grantedCapabilities:['read'],confirmation:false}
};
function ledger({reserve={reserved:true},record={recorded:true}}={}) {
 const state={reservations:[],receipts:[]};
 return {state,
  async reserve(args){state.reservations.push(args);return reserve},
  async record(args){state.receipts.push(args);return record}
 };
}
test('successful provider read is only reported after durable receipt write',async()=>{
 const l=ledger();let calls=0;
 const result=await executeDurableToolStep({...input,ledger:l,adapters:{'github.read':async({step})=>{calls++;assert.equal(step.target.repo,'Team');return {ok:true,confirmed:true,receiptId:'github-repo-12345',evidence:'Repository identity verified'}}}});
 assert.equal(calls,1);assert.equal(result.ok,true);assert.equal(result.durable,true);
 assert.equal(l.state.reservations.length,1);assert.equal(l.state.receipts.length,1);
 assert.equal(l.state.receipts[0].receiptId,'github-repo-12345');assert.equal(l.state.receipts[0].confirmed,true);
});
test('provider failure still records a negative outcome and never reports success',async()=>{
 const l=ledger();let calls=0;
 const result=await executeDurableToolStep({...input,ledger:l,adapters:{'github.read':async()=>{calls++;throw Error('private-token-not-to-leak')}}});
 assert.equal(calls,1);assert.equal(result.ok,false);assert.equal(result.status,'needs-reconciliation');
 assert.equal(l.state.reservations.length,1);assert.equal(l.state.receipts.length,1);assert.equal(l.state.receipts[0].confirmed,false);
 assert.ok(!JSON.stringify(result).includes('private-token'));
});
test('receipt persistence failure cannot report a verified provider read',async()=>{
 const l=ledger({record:{recorded:false}});let calls=0;
 const result=await executeDurableToolStep({...input,ledger:l,adapters:{'github.read':async()=>{calls++;return {ok:true,confirmed:true,receiptId:'github-repo-12345',evidence:'verified'}}}});
 assert.equal(calls,1);assert.equal(result.ok,false);assert.equal(result.reason,'outcome_persistence_failed');assert.equal(result.status,'needs-reconciliation');
});
test('reserved idempotency key is acquired before provider access',async()=>{
 const events=[];const l={async reserve(){events.push('reserve');return {reserved:true}},async record(){events.push('record');return {recorded:true}}};
 const result=await executeDurableToolStep({...input,ledger:l,adapters:{'github.read':async()=>{events.push('provider');return {ok:true,confirmed:true,receiptId:'github-repo-12345',evidence:'verified'}}}});
 assert.equal(result.ok,true);assert.deepEqual(events,['reserve','provider','record']);
});
test('ambiguous prior reservation blocks replay and provider call',async()=>{
 let calls=0,records=0;
 const l={async reserve(){return {reserved:false,status:'needs-reconciliation'}},async record(){records++;return {recorded:true}}};
 const result=await executeDurableToolStep({...input,ledger:l,adapters:{'github.read':async()=>{calls++;return {ok:true,confirmed:true,receiptId:'x',evidence:'x'}}}});
 assert.equal(result.ok,false);assert.equal(result.reason,'not_safe_to_replay');assert.equal(result.executed,false);assert.equal(calls,0);assert.equal(records,0);
});
test('read capability cannot be escalated by grant fields or adapter availability',async()=>{
 let calls=0;
 const result=await executeDurableToolStep({...input,step:{...input.step,capability:'write'},ledger:ledger(),adapters:{'github.read':async()=>{calls++;return {ok:true,confirmed:true,receiptId:'x',evidence:'x'}}}});
 assert.equal(result.ok,false);assert.equal(result.status,'denied');assert.equal(calls,0);
});
