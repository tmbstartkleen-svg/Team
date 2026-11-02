import test from 'node:test';
import assert from 'node:assert/strict';
import {safeSafeguardBase,readSafeguardSnapshot} from '../lib/safeguard-status-client.mjs';
const reply=x=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>x});
test('blocks local, insecure, parameterized and credentialed URLs',()=>{
 for(const x of ['http://example.com/','https://localhost/','https://127.0.0.1/','https://user:pass@example.com/','https://example.com/path','https://example.com/?x=1'])assert.equal(safeSafeguardBase(x),null,x);
 assert.equal(safeSafeguardBase('https://safeguard.example.com/'),'https://safeguard.example.com');
});
test('makes exactly two GET calls without secrets or redirect-following',async()=>{
 const calls=[];const now=new Date().toISOString();
 const fetcher=async(url,opts)=>{calls.push({url,opts});return reply(url.includes('public-status')?{ok:true,connected:true,lastSeen:now,version:'v1',channel:'secret'}:{ok:true,service:'safeguard',ready:true,version:'v9'});};
 const out=await readSafeguardSnapshot({baseUrl:'https://safeguard.example.com/',allowedOrigin:'https://safeguard.example.com/',channel:'sensor-a',fetcher});
 assert.equal(out.ok,true);assert.equal(out.operational,true);
 assert.equal(calls.length,2);
 assert.equal((await readSafeguardSnapshot({baseUrl:'https://safeguard.example.com/',allowedOrigin:'https://different.example.com/',channel:'sensor-a',fetcher})).error,'safeguard_adapter_not_configured');
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.opts.method==='GET'&&c.opts.redirect==='error'&&!('x-sentinel-key' in c.opts.headers)));
 assert.equal(JSON.stringify(out).includes('sensor-a'),false);assert.equal(JSON.stringify(out).includes('secret'),false);
});
test('invalid configuration and upstream failures fail closed',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw new Error('offline')};
 assert.equal((await readSafeguardSnapshot({baseUrl:'https://localhost/',channel:'a',fetcher})).error,'safeguard_adapter_not_configured');
 assert.equal(calls,0);
 assert.equal((await readSafeguardSnapshot({baseUrl:'https://example.com/',allowedOrigin:'https://example.com/',channel:'a',fetcher})).error,'safeguard_status_unavailable');
});
