import test from 'node:test';
import assert from 'node:assert/strict';
import {readEdgeStatus} from '../lib/edge-status-relay.mjs';
test('configured workers.dev origin permits only four GET requests with no credentials',async()=>{
 const urls=[],opts=[];const fetchImpl=async(url,config)=>{urls.push(url);opts.push(config);return{ok:true,headers:new Headers({'content-type':'application/json'}),json:async()=>({ok:true,service:'atlas-team',productionOperational:false})}};
 const a=await readEdgeStatus({origin:'https://atlas-team.example.workers.dev',fetchImpl});
 assert.equal(a.ok,true);assert.equal(a.certified,false);assert.equal(urls.length,4);
 assert.ok(urls.every(x=>x.startsWith('https://atlas-team.example.workers.dev/api/')));
 assert.ok(opts.every(o=>o.method==='GET'&&o.redirect==='error'&&o.credentials==='omit'));
});
test('reject arbitrary origins and missing configuration without fetch',async()=>{
 for(const origin of [undefined,'http://atlas-team.example.workers.dev','https://evil.example','https://user:secret@atlas-team.workers.dev','https://atlas-team.workers.dev/another/']){
  let called=false;const x=await readEdgeStatus({origin,fetchImpl:async()=>{called=true;throw Error('called')}});
  assert.equal(x.ok,false);assert.equal(called,false);
 }
});
