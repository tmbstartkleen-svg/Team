import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../api/health.js';
import retired from '../api/execute.js';
function mock(method='POST',body={}){
 const req={method,body,headers:{}};
 const out={code:200,headers:{},body:null};
 const res={setHeader:(k,v)=>{out.headers[k]=v},status:(c)=>{out.code=c;return res},json:(v)=>{out.body=v;return res}};
 return {req,res,out};
}
test('health reports capabilities without secrets',()=>{
 const x=mock('GET');health(x.req,x.res);
 assert.equal(x.out.code,200);
 assert.equal(typeof x.out.body.executionConfigured,'boolean');
 assert.equal(x.out.body.capabilities.autonomousAgents,false);
});
test('legacy execution fails closed, even when a client claims approval',()=>{
 const x=mock('POST',{approved:true,task:'Perform work',persona:'Chief Architect'});
 retired(x.req,x.res);
 assert.equal(x.out.code,410);
 assert.equal(x.out.body.error,'legacy_execution_retired');
 assert.equal(x.out.body.replacement,'/api/execute-approved');
});
test('retired endpoint forbids GET',()=>{
 const x=mock('GET');retired(x.req,x.res);
 assert.equal(x.out.code,405);
});
