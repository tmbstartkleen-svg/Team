import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOneShotGitHubCertification} from '../lib/one-shot-github-certification.mjs';

const taskId='cert-github-read-20261019-v2';
const stepId='cert-github-repository-read';
const token='r'.repeat(40);
const request=()=>new Request('https://atlas-team.example/api/internal-github-certification',{
 method:'POST',
 headers:{authorization:'Bearer '+token,'content-type':'application/json'},
 body:JSON.stringify({taskId,stepId})
});

for(const [label,changes,expected] of [
 ['unset certification task allowlist',{},'certification_disabled'],
 ['different certification task allowlist',{TEAM_GITHUB_CERTIFICATION_TASK_ID:'different-cert-task'},'certification_disabled'],
 ['general executor enabled',{TEAM_GITHUB_CERTIFICATION_TASK_ID:taskId,TEAM_TOOL_EXECUTOR_ENABLED:'true'},'general_release_must_be_off'],
 ['general executor released',{TEAM_GITHUB_CERTIFICATION_TASK_ID:taskId,TEAM_TOOL_EXECUTOR_RELEASED:'true'},'general_release_must_be_off']
]){
 test('rollback guard rejects '+label+' before database lookup or adapter call',async()=>{
  let dbCalls=0,fetchCalls=0,execCalls=0;
  const env={
   TEAM_EXECUTOR_TOKEN:token,
   TEAM_DB:{prepare(){dbCalls++;throw Error('database must not be accessed')}},
   ...changes
  };
  const result=await handleOneShotGitHubCertification(request(),env,{
   fetcher:async()=>{fetchCalls++;throw Error('external fetch must not run')},
   execute:async()=>{execCalls++;throw Error('executor must not run')}
  });
  assert.equal(result.status,503);
  assert.equal((await result.json()).error,expected);
  assert.equal(dbCalls,0);
  assert.equal(fetchCalls,0);
  assert.equal(execCalls,0);
 });
}
