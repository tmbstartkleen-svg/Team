import test from 'node:test';
import assert from 'node:assert/strict';
import {executeDurableToolStep} from '../lib/durable-tool-execution.mjs';

const input={
 taskId:'cert-github-read-20261019-v2',
 stepId:'cert-github-repository-read',
 step:{persona:'release-review',tool:'github.read',capability:'read',idempotencyKey:'cert-github-read-20261019-v2-once',target:{owner:'tmbstartkleen-svg',repo:'Team',resource:'repository'}},
 approval:{taskApproved:true,allowedTools:['github.read'],grantedCapabilities:['read'],confirmation:false}
};
for(const status of ['reserved','executed','needs-reconciliation']){
 test('duplicate ledger state '+status+' blocks repeat adapter invocation',async()=>{
  let reservations=0,records=0,adapterCalls=0;
  const ledger={
   async reserve(){reservations++;return {reserved:false,status}},
   async record(){records++;throw Error('unexpected record')}
  };
  const adapters={'github.read':async()=>{adapterCalls++;throw Error('unexpected external request')}};
  const result=await executeDurableToolStep({...input,ledger,adapters});
  assert.deepEqual({ok:result.ok,executed:result.executed,reason:result.reason},{ok:false,executed:false,reason:'not_safe_to_replay'});
  assert.equal(result.status,status);
  assert.equal(reservations,1);
  assert.equal(records,0);
  assert.equal(adapterCalls,0);
 });
}
test('missing approval cannot reserve a replay key or invoke adapter',async()=>{
 let reserveCalls=0,adapterCalls=0;
 const ledger={async reserve(){reserveCalls++;return {reserved:true}}};
 const result=await executeDurableToolStep({...input,approval:{...input.approval,taskApproved:false},ledger,adapters:{'github.read':async()=>{adapterCalls++}}});
 assert.equal(result.ok,false);
 assert.equal(result.executed,false);
 assert.equal(reserveCalls,0);
 assert.equal(adapterCalls,0);
});
