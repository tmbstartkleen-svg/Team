import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerGitHubGrant} from '../lib/owner-github-grant-api.mjs';

const token='o'.repeat(40);
const taskId='cert-github-read-20261019-v2';
const url='https://atlas-team.example/api/owner-github-grant';
const request=()=>new Request(url,{
 method:'POST',
 headers:{authorization:'Bearer '+token,'content-type':'application/json'},
 body:JSON.stringify({taskId,confirm:'GRANT-READ-ONLY-TEAM-REPO'})
});
for(const [name,task,audit] of [
 ['unapproved task',{owner_approved:0,state:'queued',assigned_persona:'release-review'},{decision:'approved'}],
 ['missing approval receipt',{owner_approved:1,state:'queued',assigned_persona:'release-review'},null],
 ['rejected approval receipt',{owner_approved:1,state:'queued',assigned_persona:'release-review'},{decision:'rejected'}],
 ['blocked task',{owner_approved:1,state:'blocked',assigned_persona:'release-review'},{decision:'approved'}],
 ['wrong persona',{owner_approved:1,state:'queued',assigned_persona:'another-persona'},{decision:'approved'}],
]){
 test('owner grant denied for '+name+' without grant insertion',async()=>{
  let reads=0,writes=0;
  const db={prepare(sql){
   if(sql.startsWith('INSERT')){writes++;throw Error('unexpected grant insertion')}
   return {bind(){return {first:async()=>{reads++;return sql.includes('team_approval_audit')?audit:task}}}};
  }};
  const r=await handleOwnerGitHubGrant(request(),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
  assert.equal(r.status,403);
  assert.equal((await r.json()).error,'approval_required');
  assert.equal(reads,2);
  assert.equal(writes,0);
 });
}
test('rollback general-release guard denies grant before DB access',async()=>{
 let touched=false;
 const r=await handleOwnerGitHubGrant(request(),{
  TEAM_OWNER_API_TOKEN:token,TEAM_TOOL_EXECUTOR_ENABLED:'true',
  TEAM_DB:{prepare(){touched=true;throw Error('unexpected DB lookup')}}
 });
 assert.equal(r.status,503);
 assert.equal(touched,false);
});
