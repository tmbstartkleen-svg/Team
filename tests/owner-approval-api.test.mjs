import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerApproval} from '../lib/owner-approval-api.mjs';
const token='x'.repeat(40),url='https://team.example/api/owner-approval';
const body=JSON.stringify({taskId:'t1',decision:'approved',reason:'Owner reviewed task scope'});
function req(auth=true,content=body,headers={}){return new Request(url,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+token}:{}),...headers},body:content});}
test('anonymous approvals are denied',async()=>assert.equal((await handleOwnerApproval(req(false),{TEAM_OWNER_API_TOKEN:token})).status,401));
test('cross-origin approval writes are rejected',async()=>assert.equal((await handleOwnerApproval(req(true,body,{origin:'https://untrusted.example'}),{TEAM_OWNER_API_TOKEN:token})).status,403));
test('approved write requires connected D1',async()=>assert.equal((await handleOwnerApproval(req(),{TEAM_OWNER_API_TOKEN:token})).status,503));
test('invalid decision rejected before database mutation',async()=>{
 const db={prepare(){throw Error('unexpected SQL')},batch(){throw Error('unexpected batch')}};
 const r=await handleOwnerApproval(req(true,JSON.stringify({taskId:'t1',decision:'approved',reason:'bad'})),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
 assert.equal(r.status,400);
});
test('successful approval emits persisted audit receipt',async()=>{
 const calls=[];const db={prepare(sql){return {bind(...args){calls.push({sql,args});return {sql,args}}}},batch:async()=>[{results:[{id:'t1'}]},{results:[{id:'audit'}]}]};
 const r=await handleOwnerApproval(req(),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
 assert.equal(r.status,201);const out=await r.json();assert.equal(out.recorded,true);assert.equal(calls.length,2);
});
test('failed audit transaction never claims approval',async()=>{
 const db={prepare(sql){return {bind(){return {sql}}}},batch:async()=>[{results:[]},{results:[]}]};
 const r=await handleOwnerApproval(req(),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
 assert.equal(r.status,409);assert.equal((await r.json()).ok,false);
});
