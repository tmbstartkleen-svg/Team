import test from 'node:test';
import assert from 'node:assert/strict';
import {projectAtlasSecurityExport} from '../lib/safeguard-atlas-export-contract.mjs';
test('rejects schema mismatch and unscoped raw data',()=>{
 assert.equal(projectAtlasSecurityExport({ok:true,alerts:[]}).ok,false);
 assert.equal(projectAtlasSecurityExport({ok:true,schema:'wrong',readOnly:true,alerts:[],evidence:{records:[]}}).ok,false);
});
test('accepts v1 data while excluding unexpected sensitive fields',()=>{
 const raw={ok:true,schema:'atlas-security-read-v1',readOnly:true,alerts:[{id:'a',title:'Security alert',status:'open',severity:'medium',message:'private alert'}],evidence:{count:1,records:[{id:'e',sequence:1,hash:'f'.repeat(64),payload:'private evidence'}]},secret:'private credentials'};
 const a=projectAtlasSecurityExport(raw);
 assert.equal(a.connected,true);assert.equal(a.integrity,'not_independently_verified');
 assert.equal(a.alertCount,1);assert.equal(a.evidenceCount,1);
 assert.equal(JSON.stringify(a).includes('private'),false);
});
