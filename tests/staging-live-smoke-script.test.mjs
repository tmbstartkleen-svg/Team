import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const script=new URL('../scripts/staging-live-smoke.mjs',import.meta.url);
test('live staging smoke script parses without executing requests',()=>{
 const result=spawnSync(process.execPath,['--check',script.pathname],{encoding:'utf8',timeout:5000});
 assert.equal(result.status,0,result.stderr||result.stdout);
});
