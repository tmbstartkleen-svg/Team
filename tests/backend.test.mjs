import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../api/health.js';
import execute from '../api/execute.js';
function mock(method='POST',body={},authorization=''){
 const req={method,body,headers:{authorization}};
 const out={code:200,headers:{},body:null};
 const res={setHeader:(k,v)=>{out.headers[k]=v},status:(c)=>{out.code=c;return res},json:(body)=>{out.body=body;return res}};
 return {req,res,out};
}
test('health exposes capability booleans only',()=>{const x=mock('GET');health(x.req,x.res);assert.equal(x.out.code,200);assert.equal(typeof x.out.body.executionConfigured,'boolean')});
test('execution rejects when credentials missing',async()=>{const origA=process.env.TEAM_ADMIN_TOKEN,origB=process.env.OPENAI_API_KEY;delete process.env.TEAM_ADMIN_TOKEN;delete process.env.OPENAI_API_KEY;try{const x=mock();await execute(x.req,x.res);assert.equal(x.out.code,503)}finally{if(origA)process.env.TEAM_ADMIN_TOKEN=origA;if(origB)process.env.OPENAI_API_KEY=origB}});
test('execution rejects unauthorized requests',async()=>{const oa=process.env.TEAM_ADMIN_TOKEN,ob=process.env.OPENAI_API_KEY;process.env.TEAM_ADMIN_TOKEN='test-secret';process.env.OPENAI_API_KEY='test-api-key';try{let x=mock('POST',{approved:true,task:'write software',persona:'Engineer'},'Bearer bad');await execute(x.req,x.res);assert.equal(x.out.code,401);x=mock('POST',{approved:false,task:'write software',persona:'Engineer'},'Bearer test-secret');await execute(x.req,x.res);assert.equal(x.out.code,403)}finally{if(oa===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=oa;if(ob===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=ob}});

test('unknown persona blocked before contacting provider',async()=>{const oa=process.env.TEAM_ADMIN_TOKEN,ob=process.env.OPENAI_API_KEY;process.env.TEAM_ADMIN_TOKEN='test-secret';process.env.OPENAI_API_KEY='test-api-key';try{const x=mock('POST',{approved:true,task:'Review this issue',persona:'Unknown persona'},'Bearer test-secret');await execute(x.req,x.res);assert.equal(x.out.code,400);assert.equal(x.out.body.error,'invalid_persona')}finally{if(oa===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=oa;if(ob===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=ob}});
test('unapproved model rejected by allowlist',async()=>{const old=[process.env.TEAM_ADMIN_TOKEN,process.env.OPENAI_API_KEY,process.env.TEAM_MODEL,process.env.TEAM_ALLOWED_MODELS];process.env.TEAM_ADMIN_TOKEN='test-secret';process.env.OPENAI_API_KEY='test-api-key';process.env.TEAM_MODEL='other-model';process.env.TEAM_ALLOWED_MODELS='gpt-5-mini';try{const x=mock('POST',{approved:true,task:'Review this issue',persona:'Chief Architect'},'Bearer test-secret');await execute(x.req,x.res);assert.equal(x.out.code,503);assert.equal(x.out.body.error,'model_not_allowlisted')}finally{['TEAM_ADMIN_TOKEN','OPENAI_API_KEY','TEAM_MODEL','TEAM_ALLOWED_MODELS'].forEach((key,i)=>{if(old[i]===undefined)delete process.env[key];else process.env[key]=old[i]})}});
