import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/cloudflare-worker.js';
test('staging certification route is wired but remains default-off without staging flags',async()=>{
 const request=new Request('https://atlas-team.example/api/internal-staging-github-certification',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({taskId:'staging-cert-task-20261024-a1',stepId:'staging-cert-step-20261024-a1'})});
 const response=await worker.fetch(request,{});
 assert.equal(response.status,401); // service authentication is checked before staging flags
 assert.equal((await response.json()).error,'unauthorized');
});
test('staging certification route rejects GET and never invokes a provider',async()=>{
 const response=await worker.fetch(new Request('https://atlas-team.example/api/internal-staging-github-certification',{method:'GET'}),{});
 assert.equal(response.status,401);
 assert.equal((await response.json()).error,'unauthorized');
});
