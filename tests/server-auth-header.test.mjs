import test from 'node:test';
import assert from 'node:assert/strict';
import {authorize} from '../lib/server-auth.mjs';

test('owner API requires a configured token and exact Bearer scheme',()=>{
 const previous=process.env.TEAM_ADMIN_TOKEN;
 try {
  delete process.env.TEAM_ADMIN_TOKEN;
  assert.equal(authorize({headers:{authorization:'Bearer test-secret'}}),false);
  process.env.TEAM_ADMIN_TOKEN='test-secret';
  for(const value of ['test-secret','Basic test-secret','Bearer','Bearer  test-secret','Bearer test-secret extra','Bearer test-secret\\n','Bearer wrong-secret']){
   assert.equal(authorize({headers:{authorization:value}}),false,value);
  }
  assert.equal(authorize({headers:{authorization:'Bearer test-secret'}}),true);
  assert.equal(authorize({headers:{authorization:'bearer test-secret'}}),true);
 } finally {
  if(previous===undefined)delete process.env.TEAM_ADMIN_TOKEN;
  else process.env.TEAM_ADMIN_TOKEN=previous;
 }
});
