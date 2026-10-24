import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStagingGitHubCertification} from '../lib/staging-github-certification-api.mjs';

const url='https://atlas-team.example/api/internal-staging-github-certification';
const token='staging-executor-token-long-enough';
const taskId='staging-cert-task-20261024-boundary';
const stepId='staging-cert-step-20261024-boundary';
const payload={taskId,stepId};
function req({method='POST',auth='Bearer '+token,type='application/json',body=payload}={}) {
 const headers={};if(auth)headers.authorization=auth;if(type)headers['content-type']=type;
 return new Request(url,{method,headers,body:method==='GET'?undefined:JSON.stringify(body)});
}
function env(extra={}) {
 return {
  TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',
  TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',
  TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:taskId,
  TEAM_TOOL_EXECUTOR_ENABLED:'false',TEAM_TOOL_EXECUTOR_RELEASED:'false',
  TEAM_DB:{prepare(){throw new Error('DB must not be touched in boundary test')}},
  ...extra
 };
}
test('non-JSON body is rejected before grant lookup',async()=>{
 const response=await handleStagingGitHubCertification(req({type:'text/plain'}),env());
 assert.equal(response.status,415);
 assert.equal((await response.json()).error,'json_required');
});
test('bad service token is rejected before grant lookup',async()=>{
 const response=await handleStagingGitHubCertification(req({auth:'Bearer wrong'}),env());
 assert.equal(response.status,401);
 assert.equal((await response.json()).error,'unauthorized');
});
test('unsupported method is rejected before grant lookup',async()=>{
 const response=await handleStagingGitHubCertification(req({method:'GET'}),env());
 assert.equal(response.status,405);
 assert.equal((await response.json()).error,'method_not_allowed');
});
test('general executor release switch blocks before grant lookup',async()=>{
 const response=await handleStagingGitHubCertification(req(),env({TEAM_TOOL_EXECUTOR_RELEASED:'true'}));
 assert.equal(response.status,503);
 assert.equal((await response.json()).error,'general_executor_must_remain_off');
});
test('historical protected task cannot be selected by environment configuration',async()=>{
 const protectedId='cert-github-read-20261019-v2';
 const response=await handleStagingGitHubCertification(req({body:{taskId:protectedId,stepId}}),env({TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:protectedId}));
 assert.equal(response.status,403);
 assert.equal((await response.json()).error,'new_staging_task_required');
});
