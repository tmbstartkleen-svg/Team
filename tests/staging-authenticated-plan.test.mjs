import test from 'node:test';
import assert from 'node:assert/strict';
import plan from '../api/plan.js';
import readiness from '../api/readiness.js';
function res(){let status=0,body;const headers={};return {headers,get code(){return status},get body(){return body},setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(v){body=v;return this}}}
test('isolated authenticated staging readiness never implies live execution',async()=>{
 const old=process.env.TEAM_ADMIN_TOKEN;
 process.env.TEAM_ADMIN_TOKEN='staging-test-token-not-production';
 try{
  const response=res();
  await readiness({method:'GET',headers:{authorization:'Bearer staging-test-token-not-production'}},response);
  assert.equal(response.code,200);
  assert.equal(response.body.ok,true);
  assert.equal(response.body.readiness.externalExecution,'disabled');
 }finally{if(old===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=old}
});
test('authenticated planning does not need database or model execution',async()=>{
 const old=process.env.TEAM_ADMIN_TOKEN;
 process.env.TEAM_ADMIN_TOKEN='staging-test-token-not-production';
 try{
  const response=res();
  await plan({method:'POST',headers:{authorization:'Bearer staging-test-token-not-production','content-type':'application/json'},body:{goal:'Review a non-operational test checklist',maxStages:2}},response);
  assert.equal(response.code,200);
  assert.equal(response.body.ok,true);
  assert.ok(response.body.plan);
 }finally{if(old===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=old}
});
