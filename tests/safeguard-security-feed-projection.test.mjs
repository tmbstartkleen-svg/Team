import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSafeguardAlerts,projectSafeguardEvidence,emptySafeguardSecurityFeed} from '../lib/safeguard-security-feed-projection.mjs';
test('alerts project only public workflow metadata, never raw details or secrets',()=>{
 const r=projectSafeguardAlerts({ok:true,alerts:[{id:'A-1',title:'Possible issue',status:'open',severity:'high',type:'anomaly',createdAt:'2026-11-01T12:00:00Z',message:'private alert body',target:'private-host',secret:'never'}]});
 assert.equal(r.ok,true);
 assert.equal(r.alerts.length,1);
 const data=JSON.stringify(r);
 for(const secret of ['private alert body','private-host','never'])assert.equal(data.includes(secret),false);
});
test('invalid alerts fail closed and limits apply',()=>{
 assert.equal(projectSafeguardAlerts({ok:true,alerts:null}).ok,false);
 assert.equal(projectSafeguardAlerts({ok:false,alerts:[]}).ok,false);
 assert.equal(projectSafeguardAlerts({ok:true,alerts:Array.from({length:101},(_,i)=>({id:String(i)}))}).truncated,true);
});
test('evidence hashes and provenance allowed, raw payload is excluded',()=>{
 const hash='a'.repeat(64);
 const r=projectSafeguardEvidence({ok:true,count:1,integrity:{ok:true,private:'no'},chain:[{id:'EV-1',sequence:1,source:'sensor',category:'observation',hash,capturedAt:'2026-11-01T12:00:00Z',payload:{private:'secret'}}]});
 assert.equal(r.integrityReported,true);
 assert.equal(r.records[0].hash,hash);
 assert.equal(JSON.stringify(r).includes('secret'),false);
});
test('no scoped feed means disconnected, not empty healthy activity',()=>{
 assert.deepEqual(emptySafeguardSecurityFeed(),{ok:false,connected:false,reason:'scoped_read_only_feed_not_configured',alerts:[],evidence:[]});
});
