import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStagingGitHubCertification} from '../lib/staging-github-certification-api.mjs';
const url='https://atlas-team.example/api/internal-staging-github-certification';
const token='staging-executor-token-long-enough';
const body={taskId:'staging-cert-task-20261024-a1',stepId:'staging-cert-step-20261024-a1'};
const approvedGrant={ownerApproved:true,step:{persona:'release-review',tool:'github.read',capability:'read',target:{owner:'tmbstartkleen-svg',repo:'Team',resource:'repository'},idempotencyKey:'staging-cert-once-20261024'},approval:{taskApproved:true,allowedTools:['github.read'],grantedCapabilities:['read'],confirmation:false}};
const req=(b=body)=>new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(b)});
function baseEnv(extra={}){return {TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:body.taskId,TEAM_TOOL_EXECUTOR_ENABLED:'false',TEAM_TOOL_EXECUTOR_RELEASED:'false',TEAM_DB:{prepare(){return {bind(){return {first:async()=>null}}}}},...extra}}
test('missing persisted owner approval blocks before provider and ledger',async()=>{
 let fetches=0,ledgerAccess=0;
 const env=baseEnv({TEAM_CERT_LEDGER:{idFromName(){ledgerAccess++;return 'id'},get(){ledgerAccess++;return {reserve(){throw Error('no')}}}}});
 const r=await handleStagingGitHubCertification(req(),env,{fetcher:async()=>{fetches++;throw Error('no')}});
 assert.equal(r.status,403);assert.equal((await r.json()).error,'invalid_grant');assert.equal(fetches,0);assert.equal(ledgerAccess,0);
});
test('valid persisted grant invokes only the injected durable executor and returns its durable receipt',async()=>{
 let executed=null,fetches=0,ledgerId=null;
 const env=baseEnv({
  TEAM_DB:{prepare(sql){assert.match(sql,/FROM team_tool_step_grants/);return {bind(taskId,stepId){assert.equal(taskId,body.taskId);assert.equal(stepId,body.stepId);return {first:async()=>approvedGrant}}}}},
  TEAM_GITHUB_READ_TOKEN:'synthetic-test-github-token',
  TEAM_CERT_LEDGER:{idFromName(id){ledgerId=id;return id},get(id){assert.equal(id,body.taskId);return {reserve(){return {reserved:true}},record(){return {recorded:true}}}}}
 });
 const r=await handleStagingGitHubCertification(req(),env,{
  fetcher:async()=>{fetches++;throw Error('injected executor should own adapter call')},
  execute:async args=>{executed=args;return {ok:true,status:'verified',receiptId:'github-repo-12345',evidence:'Verified repository identity',durable:true,executed:true}}
 });
 const result=await r.json();
 assert.equal(r.status,200);assert.equal(result.classification,'STAGING_GITHUB_READ_VERIFIED');assert.equal(result.receiptId,'github-repo-12345');assert.equal(result.productionTouched,false);assert.equal(result.modelExecution,'not called');
 assert.equal(executed.taskId,body.taskId);assert.equal(executed.stepId,body.stepId);assert.equal(executed.approval.taskApproved,true);assert.ok(executed.adapters['github.read']);assert.equal(fetches,0);assert.equal(ledgerId,body.taskId);
});
test('provider token missing fails before durable execution',async()=>{
 const env=baseEnv({ TEAM_DB: { prepare: () => ({ bind: () => ({ first: async () => approvedGrant }) }) } });
 const r=await handleStagingGitHubCertification(req(),env,{execute:async()=>{throw Error('must not execute')}});
 assert.equal(r.status,503);assert.equal((await r.json()).error,'github_read_credential_missing');
});
