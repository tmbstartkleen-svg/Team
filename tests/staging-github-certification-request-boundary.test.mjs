import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStagingGitHubCertification} from '../lib/staging-github-certification-api.mjs';
const url='https://atlas-team.example/api/internal-staging-github-certification';
const token='staging-executor-token-long-enough';
const taskId='staging-cert-task-20261024-a1',stepId='staging-cert-step-20261024-a1';
const body=JSON.stringify({taskId,stepId});
function request({contentType='application/json',auth='Bearer '+token,raw=body}={}){return new Request(url,{method:'POST',headers:{authorization:auth,'content-type':contentType},body:raw})}
function base(extra={}){return {TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:taskId,TEAM_TOOL_EXECUTOR_ENABLED:'false',TEAM_TOOL_EXECUTOR_RELEASED:'false',...extra}}
test('non-JSON requests are rejected before parsing, database, ledger, or provider access',async()=>{
 let db=0,ledger=0,provider=0,execute=0;
 const env=base({TEAM_DB:{prepare(){db++;throw Error('unexpected db')}},TEAM_CERT_LEDGER:{idFromName(){ledger++;return taskId},get(){ledger++;throw Error('unexpected ledger')}},TEAM_GITHUB_READ_TOKEN:'synthetic-token'});
 const response=await handleStagingGitHubCertification(request({contentType:'text/plain'}),env,{fetcher:async()=>{provider++;throw Error('unexpected provider')},execute:async()=>{execute++;throw Error('unexpected executor')}});
 assert.equal(response.status,415);assert.equal((await response.json()).error,'json_required');
 assert.deepEqual({db,ledger,provider,execute},{db:0,ledger:0,provider:0,execute:0});
});
test('invalid JSON and oversized payloads are rejected before database access',async()=>{
 let db=0;const env=base({TEAM_DB:{prepare(){db++;throw Error('unexpected db')}}});
 for(const [raw,status,error] of [['{',400,'invalid_json'],[' '.repeat(300),413,'payload_too_large']]){
  const response=await handleStagingGitHubCertification(request({raw}),env);
  assert.equal(response.status,status);assert.equal((await response.json()).error,error);
 }
 assert.equal(db,0);
});
test('missing and malformed authorization are rejected before staging lookup',async()=>{
 let db=0;const env=base({TEAM_DB:{prepare(){db++;throw Error('unexpected db')}}});
 for(const auth of ['', 'Bearer short']){
  const response=await handleStagingGitHubCertification(request({auth}),env);
  assert.equal(response.status,401);
 }
 assert.equal(db,0);
});
