import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerCertificationFixture} from '../lib/owner-certification-fixture-api.mjs';

const url='https://atlas-team.example/api/owner-certification-fixture';
const token='fixture-test-token'.repeat(3);
const taskId='cert-github-read-20261019-v2';
const body={taskId,confirm:'CREATE-UNAPPROVED-TEST-TASK'};
function request(b=body,headers={}){
 return new Request(url,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json',...headers},body:JSON.stringify(b)});
}
test('already existing certification task cannot be recreated or reset',async()=>{
 let inserts=0;
 const db={prepare(sql){
  assert.match(sql,/ON CONFLICT\(id\) DO NOTHING/);
  return {bind(...params){
   assert.equal(params[0],taskId);
   return {first:async()=>{inserts++;return null}};
  }};
 }};
 const r=await handleOwnerCertificationFixture(request(),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
 assert.equal(r.status,409);
 assert.equal((await r.json()).error,'fixture_already_exists');
 assert.equal(inserts,1);
});
for(const [name,b,headers,status,error] of [
 ['wrong confirmation',{...body,confirm:'APPROVE'}, {},400,'invalid_certification_fixture'],
 ['unexpected field',{...body,ownerApproved:true}, {},400,'invalid_certification_fixture'],
 ['malformed task ID',{...body,taskId:'bad id'}, {},400,'invalid_certification_fixture'],
 ['cross-origin',body,{origin:'https://other.example'},403,'cross_origin_write_denied'],
 ['wrong content type',body,{'content-type':'text/plain'},415,'json_required']
]){
 test('fixture rejects '+name+' before write',async()=>{
  let touched=false;
  const env={TEAM_OWNER_API_TOKEN:token,TEAM_DB:{prepare(){touched=true;throw Error('unexpected DB write')}}};
  const r=await handleOwnerCertificationFixture(request(b,headers),env);
  assert.equal(r.status,status);
  assert.equal((await r.json()).error,error);
  assert.equal(touched,false);
 });
}
test('fixture creation blocked while generic executor enabled',async()=>{
 let touched=false;
 const env={TEAM_OWNER_API_TOKEN:token,TEAM_EXECUTOR_ENABLED:'true',TEAM_DB:{prepare(){touched=true;throw Error('unexpected DB write')}}};
 const r=await handleOwnerCertificationFixture(request(),env);
 assert.equal(r.status,503);
 assert.equal((await r.json()).error,'executor_must_be_disabled');
 assert.equal(touched,false);
});
