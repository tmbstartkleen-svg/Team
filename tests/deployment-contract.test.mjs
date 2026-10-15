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
