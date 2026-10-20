import test from 'node:test';
import assert from 'node:assert/strict';
import {handleReleaseOperatorConsole,renderReleaseOperatorConsole} from '../lib/release-operator-console.mjs';
test('console exposes owner-oriented read-only information without write controls',async()=>{
 const html=renderReleaseOperatorConsole();
 assert.match(html,/Release Command Center/);
 assert.match(html,/fetch\('\/api\/release-evidence-dashboard'/);
 assert.match(html,/cert-github-read-20261019-v2/);
 assert.doesNotMatch(html,/fetch\('\/api\/owner-approval'/);
 assert.doesNotMatch(html,/innerHTML\s*=/);
 const r=handleReleaseOperatorConsole(new Request('https://test.local/release-console'));
 assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/connect-src 'self'/);
});
test('console denies mutating HTTP methods',()=>{
 const r=handleReleaseOperatorConsole(new Request('https://test.local/release-console',{method:'POST'}));
 assert.equal(r.status,405);
});

test('owner project lookup is optional, authenticated and cleared from input',()=>{
 const html=renderReleaseOperatorConsole();
 assert.match(html,/fetch\('\/api\/owner-workspace'/);
 assert.match(html,/authorization:'Bearer '\+token/);
 assert.match(html,/input\.value=''/);
 assert.match(html,/credentials:'omit'/);
 assert.match(html,/data\.agentExecutionActive!==false/);
 assert.doesNotMatch(html,/localStorage/);
 assert.doesNotMatch(html,/sessionStorage/);
});

test('task inspection reads owner-gated APIs without write endpoints',()=>{
 const html=renderReleaseOperatorConsole();
 assert.ok(html.includes('/api/owner-task-preflight?taskId='));
 assert.ok(html.includes('/api/owner-approval-history?taskId='));
 assert.ok(html.includes("byId('audit-token')"));
 assert.ok(html.includes("input.value=''"));
 assert.ok(html.includes("method:'GET'"));
 assert.ok(!html.includes("fetch('/api/owner-approval'"));
 assert.ok(!html.includes("fetch('/api/internal-executor-run'"));
});

test('reliability panel distinguishes config checks from actual receipts',()=>{
 const html=renderReleaseOperatorConsole();
 for(const field of ['reliability-list','database-binding','database-schema','executor-database-schema','persistent-task-recovery','durable-recovery','monitoring','rollback'])assert.ok(html.includes(field));
 assert.ok(html.includes('Recovery drills, monitoring alarms, and rollback evidence require independent certification.'));
 assert.ok(html.includes("byId('reliability-list').replaceChildren();"));
});

test('executive owner signoff view cannot issue approvals and fails closed',()=>{
 const html=renderReleaseOperatorConsole();
 for(const marker of ['Executive release decision','evidence-list','remainingMilestones===0','requiredGatesOpen.length===0','Final owner confirmation still required','Evidence unavailable. Release blocked.'])assert.ok(html.includes(marker));
 assert.ok(!html.includes("fetch('/api/owner-approval'"));
 assert.ok(!html.includes("fetch('/api/internal-executor-run'"));
});
