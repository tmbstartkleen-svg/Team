import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStagingGitHubCertification} from '../lib/staging-github-certification-api.mjs';
const url='https://atlas-team.example/api/internal-staging-github-certification';
const token='staging-executor-token-long-enough';
const body={taskId:'staging-cert-task-20261024-a1',stepId:'staging-cert-step-20261024-a1'};
const req=(b=body,method='POST')=>new Request(url,{method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:method==='GET'?undefined:JSON.stringify(b)});
function env(extra={}){return {TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:body.taskId,TEAM_TOOL_EXECUTOR_ENABLED:'false',TEAM_TOOL_EXECUTOR_RELEASED:'false',TEAM_DB:{prepare(){throw Error('unexpected_db_call')}},...extra}}
test('staging certification is disabled by default before database access',async()=>{
 let calls=0;const e=env({TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:undefined,TEAM_DB:{prepare(){calls++;throw Error('db must not be called')}}});
 const r=await handleStagingGitHubCertification(req(),e,{fetcher:async()=>{throw Error('no provider call')}});
 assert.equal(r.status,503);assert.equal((await r.json()).error,'staging_certification_disabled');assert.equal(calls,0);
});
test('protected historical task IDs can never be selected',async()=>{
 const e=env({TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:'cert-github-read-20261019-v2'});
 const r=await handleStagingGitHubCertification(req({taskId:'cert-github-read-20261019-v2',stepId:body.stepId}),e);
 assert.equal(r.status,403);assert.equal((await r.json()).error,'new_staging_task_required');
});
test('invalid credentials and methods fail before database/provider access',async()=>{
 let calls=0;const e=env({TEAM_DB:{prepare(){calls++;throw Error('must not query')}}});
 const denied=await handleStagingGitHubCertification(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),e);
 assert.equal(denied.status,401);
 const method=await handleStagingGitHubCertification(req(body,'GET'),e);
 assert.equal(method.status,405);assert.equal(calls,0);
});
test('missing or extra request fields fail closed',async()=>{
 const e=env();const r=await handleStagingGitHubCertification(req({...body,ownerApproved:true}),e);
 assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid_scope');
});
test('executor release flags must remain off',async()=>{
 const e=env({TEAM_TOOL_EXECUTOR_RELEASED:'true'});const r=await handleStagingGitHubCertification(req(),e);
 assert.equal(r.status,503);assert.equal((await r.json()).error,'general_executor_must_remain_off');
});
