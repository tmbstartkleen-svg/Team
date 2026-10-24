import test from 'node:test';
import assert from 'node:assert/strict';
import execute from '../api/execute-approved.js';
import events from '../api/events.js';
const response=()=>({code:0,body:null,headers:{},setHeader(k,v){this.headers[k]=v;return this},status(x){this.code=x;return this},json(v){this.body=v;return this}});
const uuid='00000000-0000-4000-8000-000000000001';
test('model execution remains disabled even with valid operator token',async()=>{
 const prior={TEAM_ADMIN_TOKEN:process.env.TEAM_ADMIN_TOKEN,TEAM_MODEL_EXECUTION_ENABLED:process.env.TEAM_MODEL_EXECUTION_ENABLED,OPENAI_API_KEY:process.env.OPENAI_API_KEY};
 try{
  process.env.TEAM_ADMIN_TOKEN='synthetic-integration-token';
  process.env.OPENAI_API_KEY='synthetic-never-used-test-key';
  delete process.env.TEAM_MODEL_EXECUTION_ENABLED;
  const res=response();
  await execute({method:'POST',headers:{authorization:'Bearer synthetic-integration-token','content-type':'application/json'},body:{taskId:uuid}},res);
  assert.equal(res.code,503);
  assert.equal(res.body.error,'model_execution_disabled');
 }finally{
  for(const [k,v] of Object.entries(prior)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 }
});
test('anonymous model requests and audit reads are denied',async()=>{
 for(const [handler,method] of [[execute,'POST'],[events,'GET']]){
  const res=response();await handler({method,headers:{'content-type':'application/json'},body:{taskId:uuid}},res);
  assert.equal(res.code,401);assert.equal(res.body.error,'unauthorized');
 }
});
