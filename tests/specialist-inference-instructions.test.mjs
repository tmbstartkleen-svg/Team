import test from 'node:test';
import assert from 'node:assert/strict';
import {LAUNCH_SPECIALISTS} from '../lib/launch-specialists.mjs';
import {resolveSpecialistInstructions,buildPersonaSystemInstructions} from '../lib/specialist-inference-instructions.mjs';
import {generateApprovedPersonaAnalysis} from '../lib/cloudflare-persona-provider.mjs';
import {generateWorkersPersonaAnalysis} from '../lib/workers-ai-persona-provider.mjs';
test('all launch roles have dedicated instructions without tool authorization',()=>{
 for(const p of LAUNCH_SPECIALISTS){
  assert.equal(resolveSpecialistInstructions(p.id).id,p.id);
  assert.equal(resolveSpecialistInstructions(p.name).id,p.id);
  const prompt=buildPersonaSystemInstructions(p.id);
  assert.ok(prompt.length>100,p.id);
  assert.match(prompt,/Do not execute tools/);
 }
 assert.equal(resolveSpecialistInstructions('Unknown legacy persona'),null);
});
test('both cloud and Workers AI adapters use sports guardrails as actual system messages',async()=>{
 let hostedPrompt='';
 const fetcher=async(_url,opts)=>{hostedPrompt=JSON.parse(opts.body).instructions;return new Response(JSON.stringify({status:'completed',output_text:'Analysis only.'}),{status:200});};
 await generateApprovedPersonaAnalysis({fetcher,apiKey:'test',model:'gpt-test',persona:'sports-guru',task:'Research next game lineups and expected value'});
 assert.match(hostedPrompt,/Never invent live feeds/);
 let workerPrompt='';
 await generateWorkersPersonaAnalysis({persona:'sports-guru',task:'Research next game lineups and expected value',ai:{run:async(_model,payload)=>{workerPrompt=payload.messages[0].content;return {response:'Analysis only.'};}}});
 assert.match(workerPrompt,/Never invent live feeds/);
 assert.match(workerPrompt,/Do not execute tools/);
});
test('AL detector and offline coding prompts disclose critical limits',()=>{
 assert.match(buildPersonaSystemInstructions('al-detector'),/false positives/);
 assert.match(buildPersonaSystemInstructions('coding-execution'),/never imply those are installed/);
});
