import test from 'node:test';
import assert from 'node:assert/strict';
import {createGitHubReadAdapter} from '../lib/github-read-adapter.mjs';
const token='private-test-token-never-return-this';
const base={tool:'github.read',capability:'read',target:{owner:'sample-org',repo:'example',resource:'repository'}};
const adapterFor=fetcher=>createGitHubReadAdapter({fetcher,token,allowedRepositories:['sample-org/example']});
const good=()=>new Response(JSON.stringify({id:123,full_name:'sample-org/example'}),{status:200});

test('rejects malformed owner and repo segments before network access',async()=>{
 let calls=0;const a=adapterFor(async()=>{calls++;return good()});
 for(const target of [
  {...base.target,owner:'../sample-org'},
  {...base.target,repo:'example?per_page=100'},
  {...base.target,owner:'sample-org',resource:'issue'},
  {...base.target,repo:'example/../../secret'}
 ])await assert.rejects(()=>a({step:{...base,target}}),/not_allowed/);
 assert.equal(calls,0);
});
test('passes cancellation signal and never follows redirects',async()=>{
 const controller=new AbortController();let options;
 const a=adapterFor(async(_url,o)=>{options=o;return good()});
 await a({step:base,signal:controller.signal});
 assert.equal(options.signal,controller.signal);assert.equal(options.redirect,'error');
});
test('rejects provider content length before reading body',async()=>{
 let read=false;const a=adapterFor(async()=>({ok:true,headers:{get:()=>String(32769)},text:async()=>{read=true;return '{}'}}));
 await assert.rejects(()=>a({step:base}),/too_large/);assert.equal(read,false);
});
test('rejects oversized response body without exposing provider data',async()=>{
 const a=adapterFor(async()=>new Response('x'.repeat(32769),{status:200}));
 await assert.rejects(()=>a({step:base}),/too_large/);
});
test('rejects non-JSON and non-success provider responses with sanitized errors',async()=>{
 const bad=adapterFor(async()=>new Response('sensitive provider body',{status:500}));
 await assert.rejects(()=>bad({step:base}),e=>e.message==='github_read_failed'&&!e.message.includes(token));
 const invalid=adapterFor(async()=>new Response('not json',{status:200}));
 await assert.rejects(()=>invalid({step:base}),/invalid_response/);
});
test('rejects missing identity and duplicate numeric identifier',async()=>{
 const a=adapterFor(async()=>new Response(JSON.stringify({id:0,full_name:'sample-org/example'}),{status:200}));
 await assert.rejects(()=>a({step:base}),/unverified_identity/);
});
