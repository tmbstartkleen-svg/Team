import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/launch-readiness.js';
function request(method){const headers={};let status=0,body;const res={setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(v){body=v;return this}};handler({method},res);return {status,body,headers};}
test('preview readiness always withholds execution certification',()=>{
 const x=request('GET');
 assert.equal(x.status,200);
 assert.equal(x.body.ok,true);
 assert.equal(x.body.productionOperational,false);
 assert.equal(x.body.betaReady,false);
 assert.equal(x.body.executionCertified,false);
 assert.equal(x.headers['Cache-Control'],'no-store');
 assert.ok(Array.isArray(x.body.checks));
});
test('mutation methods rejected without side effects',()=>{const x=request('POST');assert.equal(x.status,405);assert.equal(x.body.error,'method_not_allowed')});
