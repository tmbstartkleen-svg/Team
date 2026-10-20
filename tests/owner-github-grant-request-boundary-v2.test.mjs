import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerGitHubGrant} from '../lib/owner-github-grant-api.mjs';

const url='https://atlas-team.example/api/owner-github-grant';
const token='owner-only-test-token-'.repeat(3);
const allowed={taskId:'cert-github-read-20261019-v2',confirm:'GRANT-READ-ONLY-TEAM-REPO'};
function request(body=allowed,headers={}){
 return new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},body:JSON.stringify(body)});
}
for(const [label,req,env,status,error] of [
 ['anonymous request',new Request(url,{method:'POST'}),{TEAM_OWNER_API_TOKEN:token},401,'unauthorized'],
 ['cross-origin request',request(allowed,{origin:'https://untrusted.example'}),{TEAM_OWNER_API_TOKEN:token},403,'invalid_origin'],
 ['unexpected task ID',request({...allowed,taskId:'cert-github-read-20261018'}),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:{prepare(){throw Error('unexpected DB')}}},400,'invalid_scope'],
 ['unexpected confirmation',request({...allowed,confirm:'GRANT-WRITE'}),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:{prepare(){throw Error('unexpected DB')}}},400,'invalid_scope'],
 ['extra request field',request({...allowed,extra:'ignored'}),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:{prepare(){throw Error('unexpected DB')}}},400,'invalid_scope'],
 ['general released',request(),{TEAM_OWNER_API_TOKEN:token,TEAM_TOOL_EXECUTOR_RELEASED:'true',TEAM_DB:{prepare(){throw Error('unexpected DB')}}},503,'executor_not_disabled']
]){
 test('grant boundary rejects '+label+' without durable state changes',async()=>{
  const r=await handleOwnerGitHubGrant(req,env);
  assert.equal(r.status,status);
  assert.equal((await r.json()).error,error);
 });
}
