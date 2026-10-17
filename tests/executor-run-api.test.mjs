import test from 'node:test';
import assert from 'node:assert/strict';
import {handleExecutorRun} from '../lib/executor-run-api.mjs';
const token='executor-service-'.repeat(3),url='https://team.example/api/internal-executor-run';
const req=(authorization='Bearer '+token)=>new Request(url,{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({taskId:'task_1'})});
const env={TEAM_EXECUTOR_TOKEN:token,TEAM_EXECUTOR_ENABLED:'true',TEAM_EXECUTOR_GENERAL_RELEASED:'true',OPENAI_API_KEY:'mock-key',TEAM_EXECUTOR_MODEL:'mock-model',TEAM_ALLOWED_MODELS:'mock-model',TEAM_DB:{prepare(sql){return {all:async()=>({results:sql.includes("type='trigger'")?["team_approval_audit_no_update","team_approval_audit_no_delete","team_execution_receipts_no_update","team_execution_receipts_no_delete"].map(name=>({name})):sql.startsWith('PRAGMA')?['state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence','blocker_reason'].map(name=>({name})):['team_tasks','team_approval_audit','team_execution_receipts'].map(name=>({name}))})}},batch:async()=>[]}};
test('anonymous executor is forbidden',async()=>assert.equal((await handleExecutorRun(req('Bearer bad'),env)).status,401));
test('executor remains off by default even when credentials are present',async()=>assert.equal((await handleExecutorRun(req(),{...env,TEAM_EXECUTOR_ENABLED:undefined})).status,503));
test('service executor requires dedicated D1 and allowlisted model',async()=>{
 assert.equal((await handleExecutorRun(req(),{...env,TEAM_DB:undefined})).status,503);
 assert.equal((await handleExecutorRun(req(),{...env,TEAM_ALLOWED_MODELS:'another-model'})).status,503);
});
test('only authenticated, enabled, schema-ready request reaches executor',async()=>{
 let called=0;
 const response=await handleExecutorRun(req(),env,{execute:async args=>{called++;assert.equal(args.taskId,'task_1');return {ok:true,state:'verified',outputType:'analysis-only'}}});
 assert.equal(response.status,200);assert.equal(called,1);
});
test('unapproved task response cannot claim success',async()=>{
 const response=await handleExecutorRun(req(),env,{execute:async()=>({ok:false,state:'not_claimed'})});
 assert.equal(response.status,409);
});

test('Cloudflare-only executor does not need an OpenAI API key',async()=>{
 let called=0;
 const cloudflareEnv={...env,OPENAI_API_KEY:undefined,TEAM_INFERENCE_PROVIDER:'cloudflare',AI:{run:async()=>({response:'Safe analysis.'})}};
 const response=await handleExecutorRun(req(),cloudflareEnv,{execute:async args=>{
  called++;
  assert.equal(args.provider,'cloudflare');
  assert.equal(args.ai,cloudflareEnv.AI);
  assert.equal(args.apiKey,undefined);
  return {ok:true,state:'verified',outputType:'analysis-only'};
 }});
 assert.equal(response.status,200);
 assert.equal(called,1);
});
test('Cloudflare executor refuses to run without the native AI binding',async()=>{
 let called=0;
 const response=await handleExecutorRun(req(),{...env,TEAM_INFERENCE_PROVIDER:'cloudflare',AI:undefined,OPENAI_API_KEY:undefined},{execute:async()=>{called++;return {ok:true}}});
 assert.equal(response.status,503);
 assert.equal(called,0);
});
test('Cloudflare service request remains disabled without explicit opt-in',async()=>{
 let called=0;
 const response=await handleExecutorRun(req(),{...env,TEAM_INFERENCE_PROVIDER:'cloudflare',AI:{run:async()=>({response:'text'})},TEAM_EXECUTOR_ENABLED:undefined},{execute:async()=>{called++;return {ok:true}}});
 assert.equal(response.status,503);
 assert.equal(called,0);
});

test('certification mode refuses all non-certification task IDs before schema or provider access',async()=>{
 let called=0;
 const response=await handleExecutorRun(req(),{...env,TEAM_EXECUTOR_CERTIFICATION_MODE:'true',TEAM_EXECUTOR_GENERAL_RELEASED:undefined,TEAM_EXECUTOR_CERTIFICATION_TASK_ID:'cert-smoke-test-001'},{execute:async()=>{called++;return {ok:true}}});
 assert.equal(response.status,403);
 assert.equal((await response.json()).error,'certification_task_only');
 assert.equal(called,0);
});
test('certification mode permits only dedicated cert-prefixed task IDs to reach the guarded executor',async()=>{
 let called=0;
 const request=new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({taskId:'cert-smoke-test-001'})});
 const response=await handleExecutorRun(request,{...env,TEAM_EXECUTOR_CERTIFICATION_MODE:'true',TEAM_EXECUTOR_GENERAL_RELEASED:undefined,TEAM_EXECUTOR_CERTIFICATION_TASK_ID:'cert-smoke-test-001'},{execute:async args=>{called++;assert.equal(args.taskId,'cert-smoke-test-001');return {ok:false,state:'not_claimed'}}});
 assert.equal(response.status,409);
 assert.equal(called,1);
});

test('executor enablement alone cannot open the general release gate',async()=>{
 let called=0;
 const response=await handleExecutorRun(req(),{...env,TEAM_EXECUTOR_GENERAL_RELEASED:undefined},{execute:async()=>{called++;return {ok:true}}});
 assert.equal(response.status,503);
 assert.equal((await response.json()).error,'release_gate_closed');
 assert.equal(called,0);
});
test('certification mode rejects valid cert-prefixed task IDs that are not explicitly scoped',async()=>{
 let called=0;
 const request=new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({taskId:'cert-another-task-001'})});
 const response=await handleExecutorRun(request,{...env,TEAM_EXECUTOR_CERTIFICATION_MODE:'true',TEAM_EXECUTOR_GENERAL_RELEASED:undefined,TEAM_EXECUTOR_CERTIFICATION_TASK_ID:'cert-smoke-test-001'},{execute:async()=>{called++;return {ok:true}}});
 assert.equal(response.status,403);assert.equal(called,0);
});
test('certification mode refuses execution without exact configured task ID',async()=>{
 let called=0;
 const request=new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({taskId:'cert-smoke-test-001'})});
 const response=await handleExecutorRun(request,{...env,TEAM_EXECUTOR_CERTIFICATION_MODE:'true',TEAM_EXECUTOR_GENERAL_RELEASED:undefined,TEAM_EXECUTOR_CERTIFICATION_TASK_ID:undefined},{execute:async()=>{called++;return {ok:true}}});
 assert.equal(response.status,403);assert.equal(called,0);
});
