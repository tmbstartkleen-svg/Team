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

test('Worker binding supports chat-completion response shape',async()=>{
 const result=await generateWorkersPersonaAnalysis({ai:{run:async()=>({choices:[{message:{content:'Bounded analysis from chat shape.'}}]})},persona:'Operations',task:'Analyze the sanitation shift handoff.'});
 assert.equal(result.text,'Bounded analysis from chat shape.');
});
test('Worker binding falls back when response field exists but is blank',async()=>{
 const result=await generateWorkersPersonaAnalysis({ai:{run:async()=>({response:'  ',output_text:'Verified fallback analysis.'})},persona:'Operations',task:'Analyze the sanitation shift handoff.'});
 assert.equal(result.text,'Verified fallback analysis.');
});
test('Worker binding supports structured output text without granting tool calls',async()=>{
 const result=await generateWorkersPersonaAnalysis({ai:{run:async()=>({output:[{content:[{text:'Analysis only.'}]}]})},persona:'Operations',task:'Analyze the sanitation shift handoff.'});
 assert.equal(result.text,'Analysis only.');
 assert.equal(result.verifiedExecution,false);
});
