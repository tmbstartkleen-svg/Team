import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('dashboard uses public Cloudflare launch readiness endpoint',()=>{
 assert.match(html,/fetch\('\/api\/launch-readiness'/);
 assert.doesNotMatch(html,/fetch\('\/api\/readiness'/);
});
test('dashboard never equates configuration with certified agents',()=>{
 assert.match(html,/data\.productionOperational===true&&data\.agentsActive===true&&data\.betaReady===true/);
 assert.match(html,/Not certified \/ inactive/);
 assert.match(html,/owner release approval remains required/);
 assert.match(html,/Launch readiness unavailable; no operational status can be certified/);
});
