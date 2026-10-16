import test from 'node:test';
import assert from 'node:assert/strict';
import {generateApprovedPersonaAnalysis} from '../lib/cloudflare-persona-provider.mjs';
const base={apiKey:'test-key',model:'gpt-test',persona:'QA Engineer',task:'Review database task recovery implementation'};
test('bounded provider adapter produces a proposal, not execution evidence',async()=>{
 let request;
 const fetcher=async(url,init)=>{request={url,init};return new Response(JSON.stringify({status:'completed',id:'req-1',output_text:'Review the lease expiration conditions.'}),{status:200,headers:{'content-type':'application/json'}})};
 const result=await generateApprovedPersonaAnalysis({...base,fetcher});
 assert.equal(request.url,'https://api.openai.com/v1/responses');
 assert.equal(JSON.parse(request.init.body).store,false);
 assert.equal(result.verifiedExecution,false);
 assert.equal(result.requestId,'req-1');
});
test('rejects invalid tasks before any provider request',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return new Response('{}')};
 await assert.rejects(()=>generateApprovedPersonaAnalysis({...base,fetcher,task:'short'}),TypeError);
 assert.equal(calls,0);
});
test('provider errors do not claim success',async()=>{
 await assert.rejects(()=>generateApprovedPersonaAnalysis({...base,fetcher:async()=>new Response('{}',{status:429})}),/provider_http_error/);
 await assert.rejects(()=>generateApprovedPersonaAnalysis({...base,fetcher:async()=>new Response(JSON.stringify({status:'incomplete'}))}),/provider_incomplete/);
});
