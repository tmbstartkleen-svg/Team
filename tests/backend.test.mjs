import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../api/health.js';
import {modelPolicy} from '../lib/limits.mjs';
import approved from '../api/execute-approved.js';
function mock(method='POST'){
 const req={method,headers:{}},out={status:200,body:null};
 const res={setHeader(){},status(x){out.status=x;return this},json(x){out.body=x;return this}};
 return {req,res,out};
}
test('health reports capability readiness without secrets',()=>{const x=mock('GET');health(x.req,x.res);assert.equal(x.out.status,200);assert.equal(typeof x.out.body.executionConfigured,'boolean')});
test('approved execution blocks anonymous callers',async()=>{const x=mock('POST');await approved(x.req,x.res);assert.equal(x.out.status,401)});
test('provider model is allowlist constrained',()=>{assert.equal(modelPolicy({TEAM_MODEL:'unsupported',TEAM_ALLOWED_MODELS:'approved'}).allowed,false)});
