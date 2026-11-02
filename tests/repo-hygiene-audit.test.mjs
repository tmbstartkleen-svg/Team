import test from 'node:test';
import assert from 'node:assert/strict';
import {isGeneratedOrSensitivePath,auditTrackedFiles} from '../scripts/repo-hygiene-audit.mjs';
test('reject tracked generated and secret material but preserve safe source',()=>{
 for(const path of ['.env','.env.local','.dev.vars','node_modules/pkg/a.js','app/.vercel/output.txt','coverage/lcov.info','report.log','mac/.sentinel-data/store.json','secret.pem'])
  assert.equal(isGeneratedOrSensitivePath(path),true,path);
 for(const path of ['.env.example','lib/safeguard-readonly-projection.mjs','docs/RELEASE-GATES.md','app/api/ai/detection/coverage/route.js','README.md'])
  assert.equal(isGeneratedOrSensitivePath(path),false,path);
});
test('find exact duplicate tracked files without modifying them',()=>{
 const data={'a.txt':Buffer.from('same'),'b.txt':Buffer.from('same'),'c.txt':Buffer.from('different')};
 const result=auditTrackedFiles(Object.keys(data),x=>data[x]);
 assert.deepEqual(result.identical,[['a.txt','b.txt']]);
 assert.deepEqual(result.forbidden,[]);
 assert.equal(result.trackedFiles,3);
});
