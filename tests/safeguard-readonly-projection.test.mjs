import test from 'node:test';
import assert from 'node:assert/strict';
import {projectHealth,projectSensor,projectSnapshot} from '../lib/safeguard-readonly-projection.mjs';
test('strictly allowlists health fields and strips secrets',()=>{
 const x=projectHealth({ok:true,service:'safeguard',ready:true,version:'9.2',timestamp:'2026-11-01T00:00:00Z',secret:'NO',storage:{key:'NO'}});
 assert.deepEqual(Object.keys(x),['ok','service','version','timestamp','ready']);
 assert.equal(JSON.stringify(x).includes('NO'),false);
});
test('rejects invalid service and sensor payloads',()=>{
 assert.equal(projectHealth({ok:true,service:'other'}).ok,false);
 assert.equal(projectSensor({ok:false,connected:true}).ok,false);
});
test('never treats missing heartbeat timestamp as connected',()=>{
 assert.equal(projectSensor({ok:true,connected:true,lastSeen:null}).connected,false);
});
test('read-only snapshot fails closed',()=>{
 const x=projectSnapshot({health:{ok:true,service:'safeguard',ready:true},sensor:{ok:false,connected:true}});
 assert.equal(x.operational,false);
 assert.equal(x.mode,'read-only');
});
