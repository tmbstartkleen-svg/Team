import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedExecutor} from '../lib/executor-service-auth.mjs';
import {handleOwnerCollaboration} from '../lib/owner-collaboration-api.mjs';
import {quarantineExpiredTaskLeases} from '../lib/d1-task-queue.mjs';
import {handleExecutorRun} from '../lib/executor-run-api.mjs';

const owner='owner-secret-'.repeat(4),service='executor-secret-'.repeat(4);
test('owner credentials cannot invoke executor identity',async()=>{
 const request=new Request('https://team.example/api/internal-executor-run',{headers:{authorization:'Bearer '+owner}});
 assert.equal(await authorizedExecutor(request,{TEAM_EXECUTOR_TOKEN:service,TEAM_OWNER_API_TOKEN:owner}),false);
});
test('executor credentials cannot read owner-private collaboration',async()=>{
 const req=new Request('https://team.example/api/owner-collaboration?projectId=project1',{headers:{authorization:'Bearer '+service}});
 const r=await handleOwnerCollaboration(req,{TEAM_OWNER_API_TOKEN:owner,TEAM_EXECUTOR_TOKEN:service});
 assert.equal(r.status,401);
});
test('orphaned leases are blocked for owner review rather than retried',async()=>{
 const statements=[];
 const db={prepare(sql){return {bind(limit){statements.push({sql,limit});return {all:async()=>({results:[{id:'task1',state:'blocked',blocker_reason:'lease-expired'}]})}}}}};
 const out=await quarantineExpiredTaskLeases(db,{limit:25});
 assert.equal(out.requiresOwnerReview,true);
 assert.equal(out.recovered[0].reason,'lease-expired');
 assert.match(statements[0].sql,/state='blocked'/);
 assert.doesNotMatch(statements[0].sql,/state='queued'/);
});
test('unconfigured executor cannot invoke inference or task mutation',async()=>{
 let touched=false;
 const request=new Request('https://team.example/api/internal-executor-run',{method:'POST',headers:{authorization:'Bearer '+service,'content-type':'application/json'},body:JSON.stringify({taskId:'task1'})});
 const response=await handleExecutorRun(request,{TEAM_EXECUTOR_TOKEN:service,TEAM_EXECUTOR_ENABLED:'false'},{execute:async()=>{touched=true;return {ok:true}}});
 assert.equal(response.status,503);assert.equal(touched,false);
});
