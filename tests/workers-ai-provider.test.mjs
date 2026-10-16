import test from 'node:test';
import assert from 'node:assert/strict';
import {generateWorkersPersonaAnalysis,FREE_WORKERS_AI_MODEL} from '../lib/workers-ai-persona-provider.mjs';

test('Workers AI returns analysis-only result from bounded input',async()=>{
 let called=0;
 const result=await generateWorkersPersonaAnalysis({ai:{run:async(model,payload)=>{
  called++;assert.equal(model,FREE_WORKERS_AI_MODEL);assert.equal(payload.max_tokens,512);
  assert.equal(payload.messages[1].content,'Analyze the sanitation shift handoff.');
  return {response:'Review procedures and confirm handoff.'};
 }},persona:'Operations',task:'Analyze the sanitation shift handoff.'});
 assert.equal(called,1);assert.equal(result.text,'Review procedures and confirm handoff.');
 assert.equal(result.verifiedExecution,false);
});
test('Workers AI rejects missing binding or output',async()=>{
 await assert.rejects(()=>generateWorkersPersonaAnalysis({ai:null,persona:'Operations',task:'Analyze the sanitation shift handoff.'}),/invalid_workers_ai_context/);
 await assert.rejects(()=>generateWorkersPersonaAnalysis({ai:{run:async()=>({response:''})},persona:'Operations',task:'Analyze the sanitation shift handoff.'}),/workers_ai_output_invalid/);
});
