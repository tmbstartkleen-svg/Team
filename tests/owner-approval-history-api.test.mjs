import test from 'node:test';
import assert from 'node:assert/strict';
import {handleOwnerApprovalHistory} from '../lib/owner-approval-history-api.mjs';
const token='z'.repeat(40),url='https://team.example/api/owner-approval-history';
const req=(suffix='',authorized=true,method='GET')=>new Request(url+suffix,{method,headers:authorized?{authorization:'Bearer '+token}:{}});
test('denies anonymous approval-history access',async()=>assert.equal((await handleOwnerApprovalHistory(req('?taskId=t1',false),{TEAM_OWNER_API_TOKEN:token})).status,401));
test('requires a valid task id and database',async()=>{
 assert.equal((await handleOwnerApprovalHistory(req(),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:{prepare(){}}})).status,400);
 assert.equal((await handleOwnerApprovalHistory(req('?taskId=t1'),{TEAM_OWNER_API_TOKEN:token})).status,503);
});
test('reads only bounded task-specific audit history',async()=>{
 const calls=[];
 const db={prepare(sql){calls.push(sql);return {bind(id){calls.push(id);return {all:async()=>({results:[{id:'a1',decision:'approved'}]})}}}}};
 const r=await handleOwnerApprovalHistory(req('?taskId=task_1'),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db});
 assert.equal(r.status,200);assert.equal((await r.json()).decisions[0].id,'a1');
 assert.match(calls[0],/WHERE task_id=\?/);assert.match(calls[0],/LIMIT 50/);assert.equal(calls[1],'task_1');
});
test('missing audit schema does not fabricate results',async()=>{
 const db={prepare(){throw new Error('missing table')}};
 assert.equal((await handleOwnerApprovalHistory(req('?taskId=t1'),{TEAM_OWNER_API_TOKEN:token,TEAM_DB:db})).status,503);
});
