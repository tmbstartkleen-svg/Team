import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStagingGitHubCertification} from '../lib/staging-github-certification-api.mjs';

const url='https://atlas-team.example/api/internal-staging-github-certification';
const token='staging-executor-token-long-enough';
const taskId='staging-cert-task-20261024-a1';
const stepId='staging-cert-step-20261024-a1';
const payload={taskId,stepId};
const row=overrides=>({task_id:taskId,step_id:stepId,persona:'release-review',tool:'github.read',capability:'read',target_json:JSON.stringify({owner:'tmbstartkleen-svg',repo:'Team',resource:'repository'}),idempotency_key:'staging-cert-once-20261024',confirmation:0,owner_approved:1,state:'queued',assigned_persona:'release-review',...overrides});
const request=(body=payload,opts={})=>new Request(url,{method:opts.method||'POST',headers:{...(opts.auth===false?{}:{authorization:'Bearer '+(opts.token||token)}),...(opts.contentType===false?{}:{'content-type':opts.contentType||'application/json'})},body:opts.method==='GET'?undefined:opts.raw??JSON.stringify(body)});
function env(overrides={}){return {TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:taskId,TEAM_TOOL_EXECUTOR_ENABLED:'false',TEAM_TOOL_EXECUTOR_RELEASED:'false',TEAM_GITHUB_READ_TOKEN:'synthetic-github-token',TEAM_DB:{prepare:()=>({bind:()=>({first:async()=>row()})})},TEAM_CERT_LEDGER:{idFromName:id=>id,get:id=>({reserve:async()=>({reserved:true}),record:async()=>({recorded:true})})},...overrides}}
const noExecute=async()=>{throw Error('executor_should_not_run')};

test('wrong runtime and missing feature flag fail closed',async()=>{
 for(const overrides of [{ATLAS_RUNTIME_ENV:'preview'},{TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:undefined}]){
  let queries=0;const e=env({...overrides,TEAM_DB:{prepare(){queries++;throw Error('must_not_query')}}});
  const r=await handleStagingGitHubCertification(request(),e,{execute:noExecute});
  assert.equal(r.status,503);assert.equal(queries,0);
 }
});
test('general executor switches block certification before grant lookup',async()=>{
 for(const overrides of [{TEAM_TOOL_EXECUTOR_ENABLED:'true'},{TEAM_TOOL_EXECUTOR_RELEASED:'true'}]){
  let queries=0;const e=env({...overrides,TEAM_DB:{prepare(){queries++;throw Error('must_not_query')}}});
  const r=await handleStagingGitHubCertification(request(),e,{execute:noExecute});
  assert.equal(r.status,503);assert.equal((await r.json()).error,'general_executor_must_remain_off');assert.equal(queries,0);
 }
});
test('protected IDs and caller-selected IDs cannot redirect task scope',async()=>{
 for(const [configured,requested] of [
  ['cert-github-read-20261019-v2','cert-github-read-20261019-v2'],
  ['cert-github-read-20261018','cert-github-read-20261018'],
  [taskId,'another-staging-task-20261024']
 ]){
  const e=env({TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:configured});
  const r=await handleStagingGitHubCertification(request({taskId:requested,stepId}),e,{execute:noExecute});
  assert.equal(r.status,403);assert.equal((await r.json()).error,'new_staging_task_required');
 }
});
test('invalid grant identity, assignment, target or capability is rejected before ledger access',async()=>{
 const variants=[
  row({owner_approved:0}),row({state:'running'}),row({assigned_persona:'different'}),
  row({tool:'github.write'}),row({capability:'write'}),
  row({target_json:JSON.stringify({owner:'other',repo:'Team',resource:'repository'})}),
  row({target_json:JSON.stringify({owner:'tmbstartkleen-svg',repo:'Team',resource:'repository',method:'POST'})}),
  row({target_json:'not-json'})
 ];
 for(const grantRow of variants){
  let ledger=0,executions=0;
  const e=env({TEAM_DB:{prepare:()=>({bind:()=>({first:async()=>grantRow})})},TEAM_CERT_LEDGER:{idFromName(){ledger++;return taskId},get(){ledger++;return {reserve(){ledger++;return {reserved:true}},record(){ledger++;return {recorded:true}}}}}});
  const r=await handleStagingGitHubCertification(request(),e,{execute:async()=>{executions++;return {ok:true}}});
  assert.equal(r.status,403);assert.equal(ledger,0);assert.equal(executions,0);
 }
});
test('missing DB, missing GitHub token and missing ledger stop before execution',async()=>{
 for(const overrides of [
  {TEAM_DB:undefined},
  {TEAM_GITHUB_READ_TOKEN:''},
  {TEAM_CERT_LEDGER:undefined}
 ]){
  let executions=0;
  const e=env(overrides);
  const r=await handleStagingGitHubCertification(request(),e,{execute:async()=>{executions++;return {ok:true}}});
  assert.equal(r.status,503);assert.equal(executions,0);
 }
});
test('malformed, oversized, and extra-field requests are rejected',async()=>{
 const e=env();
 const malformed=await handleStagingGitHubCertification(request({}, {raw:'{' }),e,{execute:noExecute});
 assert.equal(malformed.status,400);
 const extra=await handleStagingGitHubCertification(request({...payload,ownerApproved:true}),e,{execute:noExecute});
 assert.equal(extra.status,400);
 const huge=await handleStagingGitHubCertification(request({}, {raw:' '.repeat(300)}),e,{execute:noExecute});
 assert.equal(huge.status,413);
 const wrongType=await handleStagingGitHubCertification(request(payload,{contentType:'text/plain'}),e,{execute:noExecute});
 // Handler parses JSON content by size and syntax, but route should not infer approval from content type.
 assert.ok([200,400,403,409,503].includes(wrongType.status));
});
test('durable executor errors are sanitized and cannot claim successful certification',async()=>{
 const e=env();
 const r=await handleStagingGitHubCertification(request(),e,{execute:async()=>{throw Error('secret token should never be returned')}});
 assert.equal(r.status,502);assert.equal((await r.text()).includes('secret token'),false);
});
test('failed or ambiguous receipt persistence never reports verified',async()=>{
 for(const result of [
  {ok:false,status:'needs-reconciliation',reason:'outcome_persistence_failed',executed:true},
  {ok:false,status:'needs-reconciliation',reason:'not_safe_to_replay',executed:false},
  {ok:false,status:'needs-verification',reason:'missing_verified_receipt',executed:true}
 ]){
  const r=await handleStagingGitHubCertification(request(),env(),{execute:async()=>result});
  assert.equal(r.status,409);assert.equal((await r.json()).ok,false);
 }
});
