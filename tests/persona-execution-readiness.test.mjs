import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPersonaExecution} from '../lib/persona-execution-readiness.mjs';
import worker from '../src/cloudflare-worker.js';
test('unconfigured persona executor is disabled',()=>{
 const result=assessPersonaExecution({});
 assert.equal(result.providerConfigured,false);
 assert.equal(result.executorActive,false);
 assert.equal(result.taskExecutionAllowed,false);
});
test('credentials and storage do not certify actual model execution',()=>{
 const env={OPENAI_API_KEY:'test-key',TEAM_ALLOWED_MODELS:'test-model',TEAM_OWNER_API_TOKEN:'x'.repeat(40),TEAM_DB:{prepare(){}}};
 const result=assessPersonaExecution(env);
 assert.equal(result.providerConfigured,true);
 assert.equal(result.persistentStorageBound,true);
 assert.equal(result.inferenceVerified,false);
 assert.equal(result.taskExecutionAllowed,false);
});
test('Cloudflare reports no autonomous execution without making an upstream call',async()=>{
 const result=await worker.fetch(new Request('https://team.example/api/persona-execution-readiness'),{ASSETS:{fetch:async()=>new Response('ui')}});
 assert.equal(result.status,200);
 const data=await result.json();
 assert.equal(data.executorActive,false);
 assert.equal(result.headers.get('cache-control'),'no-store');
});
