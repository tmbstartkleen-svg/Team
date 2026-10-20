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

test('task inspection reads existing owner-gated preflight and audit without write endpoints',()=>{
 const html=renderReleaseOperatorConsole();
 assert.match(html,/api\\/owner-task-preflight\\?taskId=/);
 assert.match(html,/api\\/owner-approval-history\\?taskId=/);
 assert.match(html,/byId\\('audit-token'\\)/);
 assert.match(html,/input\\.value=''/);
 assert.match(html,/method:'GET'/);
 assert.doesNotMatch(html,/fetch\\('\\/api\\/owner-approval'/);
 assert.doesNotMatch(html,/fetch\\('\\/api\\/internal-executor-run'/);
});
