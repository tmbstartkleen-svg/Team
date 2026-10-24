import test from 'node:test';
import assert from 'node:assert/strict';
import {vercelRequest} from '../lib/vercel-staging-transport.mjs';
const base='https://team-example.vercel.app';
test('CLI transport parses JSON and status while remaining scoped to Preview URL',()=>{
 let args;
 const result=vercelRequest({base,path:'/api/health',token:'fake-token',runner:(_cmd,a)=>{args=a;return {status:0,stdout:'{"ok":true}\n__ATLAS_HTTP_STATUS__:200'}}});
 assert.equal(result.status,200);assert.equal(result.body.ok,true);
 assert.equal(args[0],'--no-install');assert.ok(args.includes('--deployment'));assert.ok(args.includes(base));
});
test('CLI transport preserves POST method and body',()=>{
 let args;
 const body=JSON.stringify({title:'Synthetic task'});
 const r=vercelRequest({base,path:'/api/tasks',method:'POST',body,token:'fake-token',runner:(_cmd,a)=>{args=a;return {status:0,stdout:'{"ok":true}\n__ATLAS_HTTP_STATUS__:201'}}});
 assert.equal(r.status,201);assert.equal(args[args.indexOf('-X')+1],'POST');
 assert.equal(args[args.indexOf('--data-raw')+1],body);
});
test('CLI transport fails on unexpected origin, errors, or missing status',()=>{
 assert.throws(()=>vercelRequest({base,path:'https://elsewhere.vercel.app/api/health',token:'fake',runner:()=>({status:0})}),/unexpected_preview_target/);
 assert.throws(()=>vercelRequest({base,path:'/api/health',token:'fake',runner:()=>({status:1,stdout:''})}),/vercel_cli_request_failed/);
 assert.throws(()=>vercelRequest({base,path:'/api/health',token:'fake',runner:()=>({status:0,stdout:'{"ok":true}'})}),/vercel_cli_status_missing/);
});
