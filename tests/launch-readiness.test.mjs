import test from 'node:test';
import assert from 'node:assert/strict';
import {assessLaunchReadiness} from '../lib/launch-readiness.mjs';

test('no database or owner token does not claim beta readiness',async()=>{
 const state=await assessLaunchReadiness({});
 assert.equal(state.productionOperational,false);
 assert.equal(state.betaReady,false);
 assert.equal(state.verifiedDatabase,false);
 assert.equal(state.agentsActive,false);
 assert.equal(state.checks.find(x=>x.id==='database-binding').ready,false);
});

test('even configured schema and owner token are not proof of agent execution',async()=>{
 const names=['team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery'];
 const TEAM_DB={prepare(){return {all:async()=>({results:names.map(name=>({name}))})}}};
 const state=await assessLaunchReadiness({TEAM_DB,TEAM_OWNER_API_TOKEN:'a'.repeat(32)});
 assert.equal(state.verifiedDatabase,true);
 assert.equal(state.betaReady,false);
 assert.equal(state.productionOperational,false);
 assert.equal(state.checks.find(x=>x.id==='approved-agent-execution').ready,false);
});

test('Cloudflare Workers AI is reported configured without OpenAI while execution remains uncertified',async()=>{
 const state=await assessLaunchReadiness({TEAM_INFERENCE_PROVIDER:'cloudflare',AI:{run:async()=>({response:'ok'})}});
 assert.equal(state.checks.find(x=>x.id==='inference-provider-configured').ready,true);
 assert.equal(state.checks.find(x=>x.id==='live-inference-certified').ready,false);
 assert.equal(state.betaReady,false);
 assert.equal(state.agentsActive,false);
});
test('Cloudflare provider selected without AI binding is not reported configured',async()=>{
 const state=await assessLaunchReadiness({TEAM_INFERENCE_PROVIDER:'cloudflare'});
 assert.equal(state.checks.find(x=>x.id==='inference-provider-configured').ready,false);
 assert.equal(state.betaReady,false);
});
