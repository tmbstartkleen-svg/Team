import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOneShotGitHubCertification} from '../lib/one-shot-github-certification.mjs';

const endpoint='https://atlas-team.example/api/internal-github-certification';
const protectedTask='cert-github-read-20261019-v2';
const protectedStep='cert-github-repository-read';
const token='x'.repeat(40);
const request=(body={taskId:protectedTask,stepId:protectedStep},{method='POST',auth='Bearer '+token,contentType='application/json'}={})=>
 new Request(endpoint,{method,headers:{...(auth?{authorization:auth}:{}),...(contentType?{'content-type':contentType}:{})},body:method==='GET'?undefined:JSON.stringify(body)});
function deps({grant=null}={}){let dbCalls=0,fetchCalls=0,executeCalls=0;return {
 get counts(){return {dbCalls,fetchCalls,executeCalls}},
 env:{TEAM_EXECUTOR_TOKEN:token,TEAM_GITHUB_CERTIFICATION_TASK_ID:protectedTask,TEAM_DB:{prepare(){dbCalls++;return {bind(){return {first:async()=>grant}}}}},TEAM_TOOL_EXECUTOR_ENABLED:'false',TEAM_TOOL_EXECUTOR_RELEASED:'false'},
 options:{fetcher:async()=>{fetchCalls++;throw Error('provider_must_not_be_reached')},execute:async()=>{executeCalls++;throw Error('executor_must_not_be_reached')}}
}}
test('wrong executor token is rejected before any DB or provider call',async()=>{const d=deps({grant:null});const r=await handleOneShotGitHubCertification(request(),{...d.env,TEAM_EXECUTOR_TOKEN:'different-token'},d.options);assert.equal(r.status,401);assert.deepEqual(d.counts,{dbCalls:0,fetchCalls:0,executeCalls:0})});
test('wrong method is rejected before any DB or provider call',async()=>{const d=deps();const r=await handleOneShotGitHubCertification(request({}, {method:'GET'}),d.env,d.options);assert.equal(r.status,405);assert.deepEqual(d.counts,{dbCalls:0,fetchCalls:0,executeCalls:0})});
test('general executor release flag blocks one-shot route before DB',async()=>{const d=deps();const r=await handleOneShotGitHubCertification(request(),{...d.env,TEAM_TOOL_EXECUTOR_RELEASED:'true'},d.options);assert.equal(r.status,503);assert.equal((await r.json()).error,'general_release_must_be_off');assert.deepEqual(d.counts,{dbCalls:0,fetchCalls:0,executeCalls:0})});
test('extra request fields are rejected before DB access',async()=>{const d=deps();const r=await handleOneShotGitHubCertification(request({taskId:protectedTask,stepId:protectedStep,ownerApproved:true}),d.env,d.options);assert.equal(r.status,403);assert.equal((await r.json()).error,'invalid_scope');assert.deepEqual(d.counts,{dbCalls:0,fetchCalls:0,executeCalls:0})});
test('protected task without a persisted approved grant cannot call GitHub or executor',async()=>{const d=deps();const r=await handleOneShotGitHubCertification(request(),d.env,d.options);assert.equal(r.status,403);assert.equal((await r.json()).error,'invalid_grant');assert.equal(d.counts.fetchCalls,0);assert.equal(d.counts.executeCalls,0)});
test('missing general executor flags remain off and route does not enable them',async()=>{const d=deps();delete d.env.TEAM_TOOL_EXECUTOR_ENABLED;delete d.env.TEAM_TOOL_EXECUTOR_RELEASED;const r=await handleOneShotGitHubCertification(request(),d.env,d.options);assert.equal(r.status,403);assert.equal((await r.json()).error,'invalid_grant');assert.equal(d.counts.fetchCalls,0);assert.equal(d.counts.executeCalls,0);assert.equal(d.env.TEAM_TOOL_EXECUTOR_ENABLED,undefined);assert.equal(d.env.TEAM_TOOL_EXECUTOR_RELEASED,undefined)});
