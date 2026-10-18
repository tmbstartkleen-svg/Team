import test from 'node:test';import assert from 'node:assert/strict';
import worker from '../src/cloudflare-worker.js';
const endpoint='https://atlas-team.example/api/internal-tool-read';
test('anonymous callers are denied even without configured credentials',async()=>{const r=await worker.fetch(new Request(endpoint,{method:'POST'}),{});assert.equal(r.status,401)});
test('valid service token cannot bypass default release gates',async()=>{const token='x'.repeat(40);const r=await worker.fetch(new Request(endpoint,{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({taskId:'task-12345',stepId:'step-12345'})}),{TEAM_EXECUTOR_TOKEN:token,TEAM_DB:{prepare(){throw Error('must not query')}}});assert.equal(r.status,503)});
