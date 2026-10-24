import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateReadOnlyPreflight} from '../lib/staging-readonly-evidence.mjs';
const h={status:200,body:{environment:'preview',productionOperational:false,releaseCommit:'aabbccddeeff',
 executionConfigured:false,capabilities:{modelExecution:'disabled'},
 stagingDatabase:{connected:true,schemaReady:true}}};
const auth={status:200,body:{ok:true,tasks:[]}};
test('healthy Preview and authenticated task read is safe and complete without writes',()=>{
 const r=evaluateReadOnlyPreflight(h,auth,'aabbccddeeff');
 assert.equal(r.ok,true);assert.equal(r.taskWrites,0);assert.equal(r.stage,'operator-read');
});
test('incorrect operator token is classified separately from SSO or database failure',()=>{
 const r=evaluateReadOnlyPreflight(h,{status:401,body:{error:'unauthorized'}});
 assert.equal(r.ok,false);assert.equal(r.error,'operator_token_mismatch');assert.equal(r.taskWrites,0);
});
test('all unsafe environments fail before trying protected task read',()=>{
 for(const body of [{...h.body,environment:'production'},{...h.body,productionOperational:true},
 {...h.body,executionConfigured:true},{...h.body,stagingDatabase:{connected:false,schemaReady:true}},
 {...h.body,capabilities:{modelExecution:'configured-not-verified'}}]){
  const r=evaluateReadOnlyPreflight({status:200,body},null);
  assert.equal(r.stage,'health');assert.equal(r.ok,false);assert.equal(r.taskWrites,0);
 }
});
test('unexpected commit fails closed without a task read',()=>{
 for(const commit of ['000000000000','invalid']){
  const r=evaluateReadOnlyPreflight(h,null,commit);
  assert.equal(r.stage,'commit');assert.equal(r.taskWrites,0);
 }
});
