import test from 'node:test';
import assert from 'node:assert/strict';
import {readScopedSafeguardExport} from '../lib/safeguard-scoped-export-client.mjs';
const token='A'.repeat(48),baseUrl='https://safeguard.example.com/';
const good={ok:true,source:'safeguard',schema:'atlas-security-read-v1',readOnly:true,alerts:[],evidence:{count:0,records:[]}};
const settings={enabled:'true',baseUrl,allowedOrigin:baseUrl,token};
test('feature off never invokes remote',async()=>{
 let calls=0;const r=await readScopedSafeguardExport({...settings,enabled:'false',fetcher:()=>{calls++;}});
 assert.equal(r.connected,false);assert.equal(calls,0);
});
test('missing token or origin mismatch refuse network calls',async()=>{
 let calls=0;const fetcher=()=>{calls++;};
 assert.equal((await readScopedSafeguardExport({...settings,token:'bad',fetcher})).ok,false);
 assert.equal((await readScopedSafeguardExport({...settings,allowedOrigin:'https://wrong.example.com/',fetcher})).ok,false);
 assert.equal(calls,0);
});
test('uses only pinned GET endpoint and read credential',async()=>{
 let seen;
 const fetcher=async(url,options)=>{seen={url,options};return new Response(JSON.stringify(good),{headers:{'content-type':'application/json'}});};
 const r=await readScopedSafeguardExport({...settings,fetcher});
 assert.equal(r.connected,true);assert.equal(r.integrity,'not_independently_verified');
 assert.equal(seen.url,'https://safeguard.example.com/api/atlas-read');
 assert.equal(seen.options.method,'GET');assert.equal(seen.options.redirect,'error');
 assert.equal(seen.options.headers.authorization,'Bearer '+token);
});
test('malformed, unauthorized, or excessive responses fail closed',async()=>{
 for(const response of [new Response('',{status:401}),new Response('not-json',{headers:{'content-type':'application/json'}}),new Response('x'.repeat(131073),{headers:{'content-type':'application/json'}})]){
  const r=await readScopedSafeguardExport({...settings,fetcher:async()=>response});
  assert.equal(r.connected,false);
 }
});
