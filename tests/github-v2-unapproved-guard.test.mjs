import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOneShotGitHubCertification} from '../lib/one-shot-github-certification.mjs';

const taskId='cert-github-read-20261019-v2';
const stepId='cert-github-repository-read';
const token='t'.repeat(40);
const request=()=>new Request('https://atlas-team.example/api/internal-github-certification',{
 method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
 body:JSON.stringify({taskId,stepId})
});
const grantRow=(approved)=>({
 task_id:taskId,step_id:stepId,persona:'release-review',tool:'github.read',capability:'read',
 target_json:JSON.stringify({owner:'tmbstartkleen-svg',repo:'Team',resource:'repository'}),
 idempotency_key:'cert-github-read-20261019-v2-once',confirmation:0,
 owner_approved:approved?1:0,state:'queued',assigned_persona:'release-review'
});
for(const approved of [false,true]){
 test(approved?'approved fixture does not bypass missing scoped grant':'unapproved certification cannot reserve or invoke external adapter',async()=>{
  let queries=0,executions=0,fetches=0;
  const db={prepare:()=>{
   queries++;
   return {bind:()=>({first:async()=>approved?null:grantRow(false)})};
  }};
  const r=await handleOneShotGitHubCertification(request(),{
   TEAM_EXECUTOR_TOKEN:token,TEAM_GITHUB_CERTIFICATION_TASK_ID:taskId,TEAM_DB:db
  },{
   fetcher:async()=>{fetches++;throw new Error('must_not_fetch')},
   execute:async()=>{executions++;throw new Error('must_not_execute')}
  });
  assert.equal(r.status,403);
  assert.equal((await r.json()).error,'invalid_grant');
  assert.equal(queries,1);
  assert.equal(executions,0);
  assert.equal(fetches,0);
 });
}
