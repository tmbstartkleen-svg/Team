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
