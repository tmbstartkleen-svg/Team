import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/health.js';
function response(){
 const headers={};let status=0,body;
 return {headers,get statusCode(){return status},get body(){return body},
 setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(x){body=x;return this}};
}
test('preview health is read-only and never certifies operational execution',async()=>{
 const res=response();await handler({method:'GET'},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.ok,true);
 assert.equal(res.body.productionOperational,false);
 assert.equal(res.body.capabilities.autonomousAgents,false);
 assert.equal(res.body.releaseChecks.liveWorkflowVerified,false);
 assert.equal(res.headers['Cache-Control'],'no-store');
});
test('health endpoint refuses mutation methods',async()=>{
 const res=response();await handler({method:'POST'},res);
 assert.equal(res.statusCode,405);
 assert.equal(res.body.error,'method_not_allowed');
 assert.equal(res.headers.Allow,'GET');
});
