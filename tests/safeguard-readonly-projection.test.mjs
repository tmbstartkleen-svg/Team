import test from 'node:test';
import assert from 'node:assert/strict';
import {projectHealth,projectSensor,projectSnapshot,MAX_HEARTBEAT_AGE_MS} from '../lib/safeguard-readonly-projection.mjs';
test('strictly allowlists health fields and strips secrets',()=>{
 const x=projectHealth({ok:true,service:'safeguard',ready:true,version:'9.2',timestamp:'2026-11-01T00:00:00Z',secret:'NO',storage:{key:'NO'}});
 assert.deepEqual(Object.keys(x),['ok','service','version','timestamp','ready']);
 assert.equal(JSON.stringify(x).includes('NO'),false);
});
test('rejects invalid service and sensor payloads',()=>{
 assert.equal(projectHealth({ok:true,service:'other'}).ok,false);
 assert.equal(projectSensor({ok:false,connected:true}).ok,false);
});
test('rejects missing, stale and future heartbeat even if upstream claims connected',()=>{
 const now=Date.parse('2026-11-01T12:00:00Z');
 for(const lastSeen of [null,new Date(now-MAX_HEARTBEAT_AGE_MS-1).toISOString(),new Date(now+10).toISOString()]){
  const s=projectSensor({ok:true,connected:true,lastSeen},{now});
  assert.equal(s.connected,false,String(lastSeen));
 }
 const live=projectSensor({ok:true,connected:true,lastSeen:new Date(now-4000).toISOString()},{now});
 assert.equal(live.connected,true);assert.equal(live.fresh,true);
});
test('read-only snapshot fails closed',()=>{
 const x=projectSnapshot({health:{ok:true,service:'safeguard',ready:true},sensor:{ok:false,connected:true}});
 assert.equal(x.operational,false);
 assert.equal(x.mode,'read-only');
});
