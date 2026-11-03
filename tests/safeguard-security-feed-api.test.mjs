import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSafeguardSecurityFeed} from '../lib/safeguard-security-feed-api.mjs';
const env={TEAM_OWNER_API_TOKEN:'a'.repeat(40)};
test('unauthenticated feed fails closed',async()=>{
 const r=await handleSafeguardSecurityFeed(new Request('https://atlas.example.com/api/safeguard-security-feed'),env);
 assert.equal(r.status,401);
 assert.equal((await r.json()).error,'unauthorized');
});
test('feed does not accept effects',async()=>{
 const r=await handleSafeguardSecurityFeed(new Request('https://atlas.example.com/api/safeguard-security-feed',{method:'POST'}),env);
 assert.equal(r.status,405);
});
test('owner only receives disconnected state and never zero-incidents assertion',async()=>{
 const r=await handleSafeguardSecurityFeed(new Request('https://atlas.example.com/api/safeguard-security-feed',{headers:{authorization:'Bearer '+env.TEAM_OWNER_API_TOKEN}}),env);
 assert.equal(r.status,503);
 const body=await r.json();
 assert.deepEqual(body,{ok:false,connected:false,reason:'scoped_read_only_feed_not_configured',alerts:[],evidence:[]});
 assert.equal(r.headers.get('cache-control'),'no-store');
});

const configured={
 ...env,
 ATLAS_SAFEGUARD_SCOPED_READ_ENABLED:'true',
 ATLAS_SAFEGUARD_BASE_URL:'https://safeguard.example.com/',
 ATLAS_SAFEGUARD_ALLOWED_ORIGIN:'https://safeguard.example.com/',
 ATLAS_SAFEGUARD_READ_TOKEN:'s'.repeat(48)
};
const ownerRequest=()=>new Request('https://atlas.example.com/api/safeguard-security-feed',{
 headers:{authorization:'Bearer '+env.TEAM_OWNER_API_TOKEN}
});
test('scoped feed remains owner-only even when upstream token is configured',async()=>{
 let calls=0;
 const r=await handleSafeguardSecurityFeed(new Request('https://atlas.example.com/api/safeguard-security-feed'),
 configured,{fetcher:async()=>{calls++;throw Error('must not call');}});
 assert.equal(r.status,401);
 assert.equal(calls,0);
});
test('separate scoped token reads allowlisted metadata only',async()=>{
 const seen=[];
 const upstream={ok:true,source:'safeguard',schema:'atlas-security-read-v1',readOnly:true,
  alerts:[{id:'a',severity:'high',status:'open',title:'Alert',message:'sensitive-alert'}],
  evidence:{count:1,records:[{id:'e',sequence:1,hash:'f'.repeat(64),payload:'sensitive-payload'}]}};
 const r=await handleSafeguardSecurityFeed(ownerRequest(),configured,{fetcher:async(url,options)=>{
  seen.push({url,method:options.method,redirect:options.redirect,auth:options.headers.authorization});
  return new Response(JSON.stringify(upstream),{headers:{'content-type':'application/json'}});
 }});
 assert.equal(r.status,200);
 const body=await r.json();
 assert.equal(body.connected,true);
 assert.equal(body.integrity,'not_independently_verified');
 assert.equal(seen.length,1);
 assert.equal(seen[0].url,'https://safeguard.example.com/api/atlas-read');
 assert.equal(seen[0].method,'GET');
 assert.equal(seen[0].redirect,'error');
 assert.equal(seen[0].auth,'Bearer '+configured.ATLAS_SAFEGUARD_READ_TOKEN);
 assert.equal(JSON.stringify(body).includes('sensitive-'),false);
 assert.equal(r.headers.get('cache-control'),'no-store');
});
test('upstream rejection never turns into an empty successful incident report',async()=>{
 const r=await handleSafeguardSecurityFeed(ownerRequest(),configured,{fetcher:async()=>
  new Response('unauthorized',{status:401})});
 assert.equal(r.status,503);
 const body=await r.json();
 assert.equal(body.ok,false);
 assert.equal(body.connected,false);
});
