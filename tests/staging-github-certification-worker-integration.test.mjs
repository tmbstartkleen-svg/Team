import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/cloudflare-worker.js';
const url='https://atlas-team.example/api/internal-staging-github-certification';
const token='test-service-token-with-at-least-32-characters';
const body=JSON.stringify({taskId:'staging-cert-task-20261024-a1',stepId:'staging-cert-step-20261024-a1'});
function post(){return new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body})}
test('authenticated staging certification route stays disabled unless explicitly opted in',async()=>{
 const response=await worker.fetch(post(),{TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'false'});
 assert.equal(response.status,503);assert.equal((await response.json()).error,'staging_certification_disabled');
});
test('authenticated route rejects non-staging runtime before database or provider access',async()=>{
 let dbCalls=0,fetchCalls=0;
 const response=await worker.fetch(post(),{
  TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'production',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',
  TEAM_DB:{prepare(){dbCalls++;throw Error('must not query')}},
  TEAM_GITHUB_READ_TOKEN:'synthetic-test-token',
  fetch:async()=>{fetchCalls++;throw Error('must not fetch')}
 });
 assert.equal(response.status,503);assert.equal((await response.json()).error,'staging_certification_disabled');
 assert.equal(dbCalls,0);assert.equal(fetchCalls,0);
});
test('authenticated route cannot run when general executor release is on',async()=>{
 let dbCalls=0;
 const response=await worker.fetch(post(),{
  TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',
  TEAM_TOOL_EXECUTOR_RELEASED:'true',TEAM_DB:{prepare(){dbCalls++;throw Error('must not query')}}
 });
 assert.equal(response.status,503);assert.equal((await response.json()).error,'general_executor_must_remain_off');assert.equal(dbCalls,0);
});
