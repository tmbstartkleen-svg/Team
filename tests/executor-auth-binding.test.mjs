import test from 'node:test';import assert from 'node:assert/strict';
import {executeAuthorizedToolStep} from '../lib/authorized-tool-runner.mjs';
import {handleAuthorizedToolRun} from '../lib/authorized-tool-run-api.mjs';
const step={persona:'QA-Engineer',tool:'github.read',capability:'read',idempotencyKey:'action-12345'};
test('approval metadata cannot rewrite actual tool identity',async()=>{
 let called=false;
 const r=await executeAuthorizedToolStep({step,approval:{taskApproved:true,allowedTools:['github.issue-comment'],grantedCapabilities:['send'],tool:'github.issue-comment',capability:'send'},adapters:{'github.read':async()=>{called=true;return {confirmed:true,receiptId:'receipt-1234',evidence:'provider confirmed'}}}});
 assert.equal(r.status,'denied');assert.equal(called,false);
});
test('authorized tool retains identity and verifies trusted adapter receipt',async()=>{
 const r=await executeAuthorizedToolStep({step,approval:{taskApproved:true,allowedTools:['github.read'],grantedCapabilities:['read']},adapters:{'github.read':async()=>({confirmed:true,receiptId:'receipt-1234',evidence:'provider confirmed'})}});
 assert.equal(r.status,'verified');
});
test('default endpoint grant loader checks database row not request permission fields',async()=>{
 const token='a'.repeat(40);
 const req=new Request('https://team.example/tool-run',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({taskId:'task-12345',stepId:'step-12345',approval:{taskApproved:true}})});
 const env={TEAM_EXECUTOR_TOKEN:token,TEAM_TOOL_EXECUTOR_ENABLED:'true',TEAM_TOOL_EXECUTOR_RELEASED:'true',TEAM_DB:{prepare(){return {bind(){return {first:async()=>null}}}}}};
 const r=await handleAuthorizedToolRun(req,env);assert.equal(r.status,403);
});
