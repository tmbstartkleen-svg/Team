import test from 'node:test';
import assert from 'node:assert/strict';
import tasks from '../api/tasks.js';
import approve from '../api/approve.js';
function response(){
 return {code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},
 status(n){this.code=n;return this},json(value){this.body=value;return this}};
}
test('anonymous task write is rejected before any database connection',async()=>{
 const prev=process.env.TEAM_ADMIN_TOKEN;
 process.env.TEAM_ADMIN_TOKEN='synthetic-test-only-token';
 try{
  const res=response();
  await tasks({method:'POST',headers:{'content-type':'application/json'},body:{title:'Synthetic task',persona:'invalid'}},res);
  assert.equal(res.code,401);assert.equal(res.body.error,'unauthorized');
 }finally{if(prev===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=prev}
});
test('anonymous task approval is rejected before database access',async()=>{
 const prev=process.env.TEAM_ADMIN_TOKEN;
 process.env.TEAM_ADMIN_TOKEN='synthetic-test-only-token';
 try{
  const res=response();
  await approve({method:'POST',headers:{'content-type':'application/json'},body:{taskId:'00000000-0000-4000-8000-000000000000',decision:'approved'}},res);
  assert.equal(res.code,401);assert.equal(res.body.error,'unauthorized');
 }finally{if(prev===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=prev}
});
test('task and approval endpoints reject unsupported methods',async()=>{
 for(const handler of [tasks,approve]){
  const res=response();
  await handler({method:'DELETE',headers:{}},res);
  assert.equal(res.code,405);
  assert.equal(res.body.error,'method_not_allowed');
 }
});
