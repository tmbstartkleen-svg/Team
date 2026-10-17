import test from 'node:test';
import assert from 'node:assert/strict';
import {handleExecutorCertificationPreflight} from '../lib/executor-certification-preflight-api.mjs';
const token='executor-cert-service-'.repeat(3);
const task='cert-controlled-task-001';
const url='https://team.example/api/internal-executor-certification-preflight?taskId='+task;
const req=(auth='Bearer '+token)=>new Request(url,{headers:{authorization:auth}});
function fixture(){
 const calls=[];
 const db={batch:async()=>[],prepare(sql){return {
  all:async()=>({results:sql.includes("type='trigger'")?['team_approval_audit_no_update','team_approval_audit_no_delete','team_execution_receipts_no_update','team_execution_receipts_no_delete'].map(name=>({name})):sql.startsWith('PRAGMA')?['state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence','blocker_reason'].map(name=>({name})):['team_tasks','team_approval_audit','team_execution_receipts'].map(name=>({name}))}),
  bind(...args){calls.push({sql,args});return {first:async()=>sql.includes('COUNT(*)')?{count:0}:sql.includes('approval_audit')?{decision:'approved'}:{id:task,state:'queued',owner_approved:1,attempt_count:0,assigned_persona:'release-review'}}}
 }}};
 const env={TEAM_EXECUTOR_TOKEN:token,TEAM_EXECUTOR_ENABLED:'true',TEAM_EXECUTOR_CERTIFICATION_MODE:'true',TEAM_EXECUTOR_CERTIFICATION_TASK_ID:task,TEAM_INFERENCE_PROVIDER:'cloudflare',AI:{run:async()=>{}},TEAM_DB:db};
 return {env,calls};
}
test('anonymous preflight denied without reading database',async()=>{
 const f=fixture();const response=await handleExecutorCertificationPreflight(req('Bearer bad'),f.env);
 assert.equal(response.status,401);assert.equal(f.calls.length,0);
});
test('exact pinned and owner-approved test task is ready and causes no writes',async()=>{
 const f=fixture();const response=await handleExecutorCertificationPreflight(req(),f.env);
 assert.equal(response.status,200);const json=await response.json();assert.equal(json.ready,true);
 assert.equal(json.checks.generalReleaseOff,true);
 assert.equal(f.calls.length,3);
 assert.ok(f.calls.every(x=>x.sql.trim().startsWith('SELECT')));
});
test('enabled general release invalidates certification-only preflight',async()=>{
 const f=fixture();const response=await handleExecutorCertificationPreflight(req(),{...f.env,TEAM_EXECUTOR_GENERAL_RELEASED:'true'});
 assert.equal(response.status,503);assert.equal(f.calls.length,0);
});
test('unscoped task cannot pass certification preflight',async()=>{
 const f=fixture();const response=await handleExecutorCertificationPreflight(req(),{...f.env,TEAM_EXECUTOR_CERTIFICATION_TASK_ID:'cert-different-task-001'});
 assert.equal(response.status,503);assert.equal(f.calls.length,0);
});
test('executor disabled cannot pass preflight',async()=>{
 const f=fixture();const response=await handleExecutorCertificationPreflight(req(),{...f.env,TEAM_EXECUTOR_ENABLED:undefined});
 assert.equal(response.status,503);assert.equal(f.calls.length,0);
});
