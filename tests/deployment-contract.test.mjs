import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import vm from 'node:vm';
test('deployment stays within Hobby function limit',()=>{
 const functions=readdirSync(new URL('../api/',import.meta.url)).filter(n=>n.endsWith('.js'));
 assert.ok(functions.length<=12,'Vercel Hobby supports no more than 12 functions; found '+functions.length);
});
test('standalone dashboard JavaScript parses',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
 assert.ok(scripts.length>0,'No inline script');
 for(const m of scripts)new vm.Script(m[1],{filename:'index.html'});
});
test('no legacy execution endpoint',()=>{
 const functions=readdirSync(new URL('../api/',import.meta.url));
 assert.ok(!functions.includes('execute.js'));
});

test('provider response is bounded during streaming',()=>{const source=readFileSync(new URL('../api/execute-approved.js',import.meta.url),'utf8');assert.match(source,/bytes>1000000/);assert.match(source,/reader\.cancel\(\)/)});

test('model task claim and initial audit are committed in one transaction',()=>{const src=readFileSync(new URL('../api/execute-approved.js',import.meta.url),'utf8');const from=src.indexOf('// Claim and initial audit');const to=src.indexOf('if(!result.ok)',from);const segment=src.slice(from,to);assert.ok(from>0);assert.match(segment,/BEGIN/);assert.match(segment,/task\.model_started/);assert.match(segment,/COMMIT/);assert.match(segment,/ROLLBACK/);assert.ok(segment.indexOf('task.model_started')<segment.indexOf('COMMIT'))});

test('failure state and audit event share a transaction',()=>{const source=readFileSync(new URL('../api/execute-approved.js',import.meta.url),'utf8');const start=source.lastIndexOf('}catch{');const segment=source.slice(start);assert.match(segment,/BEGIN/);assert.match(segment,/task\.model_failed/);assert.match(segment,/status='failed'/);assert.match(segment,/COMMIT/);assert.match(segment,/ROLLBACK/);});

test('failed-execution event only records a task actually transitioned to failed',()=>{const src=readFileSync(new URL('../api/execute-approved.js',import.meta.url),'utf8');assert.match(src,/if\(update\.rowCount\)await client\.query/);assert.match(src,/status='failed'.*RETURNING id/)});

test('success audit requires completed state transition',()=>{const src=readFileSync(new URL('../api/execute-approved.js',import.meta.url),'utf8');assert.match(src,/if\(!updated\.rowCount\).*task_state_changed/);assert.match(src,/status='completed'.*RETURNING id/)});
