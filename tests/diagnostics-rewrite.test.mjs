import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import handler from '../api/diagnostics.js';
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const paths=['readiness','safeguard-status','safeguard-security-feed'];
function response(){
 return {code:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},
 status(n){this.code=n;return this;},json(v){this.body=v;return this;},end(){return this;}};
}
test('Vercel Hobby route count is within 12 after consolidation',()=>{
 assert.equal(readdirSync(new URL('../api/',import.meta.url)).filter(f=>f.endsWith('.js')).length,12);
 assert.deepEqual(config.rewrites,paths.map(x=>({source:'/api/'+x,destination:'/api/diagnostics?_atlas_route='+x})));
});
test('all consolidated diagnostics routes deny anonymous access',async()=>{
 for(const route of paths){
  const res=response();
  await handler({url:'/api/diagnostics?_atlas_route='+route,method:'GET',headers:{}},res);
  assert.equal(res.code,401,route);
 }
});
test('non-GET and unknown routes reject without side effects',async()=>{
 let res=response();await handler({url:'/api/diagnostics?_atlas_route=unknown',method:'GET',headers:{}},res);
 assert.equal(res.code,404);
 res=response();await handler({url:'/api/diagnostics?_atlas_route=readiness',method:'POST',headers:{}},res);
 assert.equal(res.code,405);
});
