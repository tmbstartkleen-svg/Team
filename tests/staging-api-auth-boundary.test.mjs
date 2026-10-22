import test from 'node:test';
import assert from 'node:assert/strict';
import tasks from '../api/tasks.js';
import plan from '../api/plan.js';
import execute from '../api/execute-approved.js';
import readiness from '../api/readiness.js';
function response(){
 let code,body;const headers={};
 return {headers,get code(){return code},get body(){return body},
 setHeader(k,v){headers[k]=v},status(n){code=n;return this},json(v){body=v;return this}};
}
test('unauthenticated staging requests fail before planning, storage or model execution',async()=>{
 // Empty credentials must never grant access even if a caller sets an empty Bearer token.
 const saved=process.env.TEAM_ADMIN_TOKEN;
 delete process.env.TEAM_ADMIN_TOKEN;
 try{
  for(const [fn,req] of [
   [tasks,{method:'GET',headers:{}}],
   [tasks,{method:'POST',headers:{'content-type':'application/json'},body:{title:'No writes',persona:'Director'}}],
   [plan,{method:'POST',headers:{'content-type':'application/json'},body:{goal:'No execution'}}],
   [execute,{method:'POST',headers:{'content-type':'application/json'},body:{taskId:'11111111-1111-1111-1111-111111111111'}}],
   [readiness,{method:'GET',headers:{}}]
  ]){
   const res=response();await fn(req,res);
   assert.equal(res.code,401);
   assert.equal(res.body.error,'unauthorized');
   assert.equal(res.headers['Cache-Control'],'no-store');
  }
 }finally{if(saved===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=saved}
});
