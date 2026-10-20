import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerApproval} from '../lib/owner-approval-api.mjs';

const url='https://atlas-team.example/api/owner-approval';
const token='owner-approval-boundary-test-token';
const body={taskId:'cert-github-read-20261019-v2',decision:'approved',reason:'Approval boundary regression test only'};
const request=(data=body,headers={})=>new Request(url,{
 method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},
 body:JSON.stringify(data)
});
for(const [label,req,status,error] of [
 ['cross-origin request',request(body,{origin:'https://untrusted.example'}),403,'cross_origin_write_denied'],
 ['invalid decision',request({...body,decision:'auto-approve'}),400,'invalid_decision'],
 ['missing reason',request({...body,reason:''}),400,'invalid_decision'],
 ['invalid task identifier',request({...body,taskId:'invalid task id'}),400,'invalid_decision'],
 ['wrong content type',request(body,{'content-type':'text/plain'}),415,'json_required']
]){
 test('owner approval rejects '+label+' before any database write',async()=>{
  let calls=0;
  const db={prepare(){calls++;throw Error('unexpected write')},batch(){calls++;throw Error('unexpected transaction')}};
  const r=await handleOwnerApproval(req,{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
  assert.equal(r.status,status);
  assert.equal((await r.json()).error,error);
  assert.equal(calls,0);
 });
}
test('anonymous request cannot access approval persistence',async()=>{
 let calls=0;
 const db={prepare(){calls++;throw Error('unexpected DB access')},batch(){calls++;throw Error('unexpected DB access')}};
 const r=await handleOwnerApproval(new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
 assert.equal(r.status,401);
 assert.equal(calls,0);
});
