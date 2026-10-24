import test from 'node:test';
import assert from 'node:assert/strict';
import {handleStagingGitHubCertification} from '../lib/staging-github-certification-api.mjs';

const endpoint='https://atlas-team.example/api/internal-staging-github-certification';
const token='staging-executor-token-long-enough';
const taskId='staging-cert-task-20261024-live-shape';
const stepId='staging-cert-step-20261024-live-shape';
const idempotencyKey='staging-cert-once-20261024-live-shape';
const request=()=>new Request(endpoint,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({taskId,stepId})});
function fixture(){
 const calls={provider:0,reserve:0,record:0,grant:0};
 let reserved=false;
 const row={task_id:taskId,step_id:stepId,persona:'release-review',tool:'github.read',capability:'read',target_json:JSON.stringify({owner:'tmbstartkleen-svg',repo:'Team',resource:'repository'}),idempotency_key:idempotencyKey,confirmation:0,owner_approved:1,state:'queued',assigned_persona:'release-review'};
 const env={
  TEAM_EXECUTOR_TOKEN:token,ATLAS_RUNTIME_ENV:'staging',TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED:'true',
  TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID:taskId,TEAM_TOOL_EXECUTOR_ENABLED:'false',TEAM_TOOL_EXECUTOR_RELEASED:'false',
  TEAM_GITHUB_READ_TOKEN:'synthetic-provider-token',
  TEAM_DB:{prepare(sql){assert.match(sql,/FROM team_tool_step_grants/);return {bind(t,s){assert.equal(t,taskId);assert.equal(s,stepId);return {first:async()=>{calls.grant++;return row}}}}},
  TEAM_CERT_LEDGER:{idFromName(id){assert.equal(id,taskId);return id},get(id){assert.equal(id,taskId);return {
   async reserve(args){calls.reserve++;assert.equal(args.taskId,taskId);assert.equal(args.stepId,stepId);if(reserved)return {reserved:false,status:'executed'};reserved=true;return {reserved:true}},
   async record(args){calls.record++;assert.equal(args.taskId,taskId);assert.equal(args.stepId,stepId);assert.equal(args.idempotencyKey,idempotencyKey);return {recorded:true}}
  }}}
 };
 const fetcher=async(url,options)=>{calls.provider++;assert.equal(url,'https://api.github.com/repos/tmbstartkleen-svg/Team');assert.equal(options.method,'GET');assert.equal(options.redirect,'error');return new Response(JSON.stringify({id:987654321,full_name:'tmbstartkleen-svg/Team'}),{status:200,headers:{'content-type':'application/json','content-length':'48'}})};
 return {env,calls,fetcher};
}
test('one staging read yields provider-verified identity and a durable receipt',async()=>{
 const f=fixture();const response=await handleStagingGitHubCertification(request(),f.env,{fetcher:f.fetcher});
 const result=await response.json();
 assert.equal(response.status,200);assert.equal(result.classification,'STAGING_GITHUB_READ_VERIFIED');assert.equal(result.receiptId,'github-repo-987654321');assert.equal(result.durable,true);assert.equal(result.productionTouched,false);assert.equal(result.modelExecution,'not called');
 assert.deepEqual(f.calls,{provider:1,reserve:1,record:1,grant:1});
});
test('same task and step replay is denied before a second provider call',async()=>{
 const f=fixture();const first=await handleStagingGitHubCertification(request(),f.env,{fetcher:f.fetcher});assert.equal(first.status,200);
 const second=await handleStagingGitHubCertification(request(),f.env,{fetcher:f.fetcher});const result=await second.json();
 assert.equal(second.status,409);assert.equal(result.ok,false);assert.equal(result.reason,'not_safe_to_replay');assert.equal(f.calls.provider,1);assert.equal(f.calls.reserve,2);assert.equal(f.calls.record,1);
});
