import test from 'node:test';
import assert from 'node:assert/strict';
import {handleSafeguardEdgeStatus} from '../lib/safeguard-edge-status-api.mjs';
const env={TEAM_OWNER_API_TOKEN:'A'.repeat(40),ATLAS_SAFEGUARD_BASE_URL:'https://safeguard.example.com/',ATLAS_SAFEGUARD_ALLOWED_ORIGIN:'https://safeguard.example.com/',ATLAS_SAFEGUARD_PUBLIC_CHANNEL:'sensor-1'};
test('unauthenticated edge requests never query Safeguard',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected call')};
 const res=await handleSafeguardEdgeStatus(new Request('https://team.example.com/api/safeguard-status'),env,{fetcher});
 assert.equal(res.status,401);assert.equal(calls,0);
});
test('edge status is GET only',async()=>{
 const res=await handleSafeguardEdgeStatus(new Request('https://team.example.com/api/safeguard-status',{method:'POST',headers:{Authorization:'Bearer '+env.TEAM_OWNER_API_TOKEN}}),env);
 assert.equal(res.status,405);
});
test('authenticated but unconfigured edge status stays fail-closed',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('unexpected call')};
 const res=await handleSafeguardEdgeStatus(new Request('https://team.example.com/api/safeguard-status',{headers:{Authorization:'Bearer '+env.TEAM_OWNER_API_TOKEN}}),{TEAM_OWNER_API_TOKEN:env.TEAM_OWNER_API_TOKEN},{fetcher});
 assert.equal(res.status,503);assert.equal(calls,0);
});
test('authenticated status returns only projected public fields',async()=>{
 const fetcher=async url=>({ok:true,headers:{get:()=> 'application/json'},json:async()=>url.includes('public-status')?{ok:true,connected:true,lastSeen:new Date().toISOString(),key:'hidden'}:{ok:true,service:'safeguard',ready:true,token:'hidden'}});
 const res=await handleSafeguardEdgeStatus(new Request('https://team.example.com/api/safeguard-status',{headers:{Authorization:'Bearer '+env.TEAM_OWNER_API_TOKEN}}),env,{fetcher});
 const data=await res.json();assert.equal(res.status,200);assert.equal(data.operational,true);
 assert.equal(JSON.stringify(data).includes('hidden'),false);
});
