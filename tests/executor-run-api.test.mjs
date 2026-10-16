import test from 'node:test';
import assert from 'node:assert/strict';
import {handleExecutorRun} from '../lib/executor-run-api.mjs';
const token='executor-service-'.repeat(3),url='https://team.example/api/internal-executor-run';
const req=(authorization='Bearer '+token)=>new Request(url,{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({taskId:'task_1'})});
const env={TEAM_EXECUTOR_TOKEN:token,TEAM_EXECUTOR_ENABLED:'true',OPENAI_API_KEY:'mock-key',TEAM_EXECUTOR_MODEL:'mock-model',TEAM_ALLOWED_MODELS:'mock-model',TEAM_DB:{prepare(sql){return {all:async()=>({results:sql.startsWith('PRAGMA')?['state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence','blocker_reason'].map(name=>({name})):['team_tasks','team_approval_audit','team_execution_receipts'].map(name=>({name}))})}},batch:async()=>[]}};
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
