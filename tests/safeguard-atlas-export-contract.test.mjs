import test from 'node:test';
import assert from 'node:assert/strict';
import {projectAtlasSecurityExport} from '../lib/safeguard-atlas-export-contract.mjs';
test('rejects schema mismatch and unscoped raw data',()=>{
 assert.equal(projectAtlasSecurityExport({ok:true,alerts:[]}).ok,false);
 assert.equal(projectAtlasSecurityExport({ok:true,schema:'wrong',readOnly:true,alerts:[],evidence:{records:[]}}).ok,false);
});
test('accepts v1 data while excluding unexpected sensitive fields',()=>{
 const raw={ok:true,schema:'atlas-security-read-v1',source:'safeguard',readOnly:true,alerts:[{id:'a',title:'Security alert',status:'open',severity:'medium',message:'private alert'}],evidence:{count:1,records:[{id:'e',sequence:1,hash:'f'.repeat(64),payload:'private evidence'}]},secret:'private credentials'};
 const a=projectAtlasSecurityExport(raw);
 assert.equal(a.connected,true);assert.equal(a.integrity,'not_independently_verified');
 assert.equal(a.alertCount,1);assert.equal(a.evidenceCount,1);
 assert.equal(JSON.stringify(a).includes('private'),false);
});

test('rejects false source, impossible evidence counts, and oversized arrays',()=>{
 const mk=()=>({ok:true,source:'safeguard',schema:'atlas-security-read-v1',readOnly:true,
  alerts:[],evidence:{count:1,records:[{id:'a'}]}});
 const spoof=mk();spoof.source='untrusted';assert.equal(projectAtlasSecurityExport(spoof).connected,false);
 const short=mk();short.evidence.count=0;assert.equal(projectAtlasSecurityExport(short).connected,false);
 const bad=mk();bad.evidence.count='1';assert.equal(projectAtlasSecurityExport(bad).connected,false);
 const alerts=mk();alerts.alerts=Array.from({length:101},()=>({id:'a'}));
 assert.equal(projectAtlasSecurityExport(alerts).connected,false);
 const evidence=mk();evidence.evidence.records=Array.from({length:101},()=>({id:'a'}));evidence.evidence.count=101;
 assert.equal(projectAtlasSecurityExport(evidence).connected,false);
});
