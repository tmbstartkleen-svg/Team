import test from 'node:test';
import assert from 'node:assert/strict';
import {LAUNCH_SPECIALISTS,LAUNCH_SPECIALIST_IDS,specialistById} from '../lib/launch-specialists.mjs';
import {routeTask,SPECIALISTS} from '../lib/route.mjs';
test('all named launch specialists have unique ids and route registrations',()=>{
 assert.equal(LAUNCH_SPECIALISTS.length,7);assert.equal(new Set(LAUNCH_SPECIALIST_IDS).size,6);
 const ids=new Set(SPECIALISTS.map(p=>p.id));
 for(const p of LAUNCH_SPECIALISTS){assert.equal(ids.has(p.id),true);assert.ok(p.verification);assert.ok(p.offline);}
 assert.equal(specialistById('unknown'),null);
});
test('sports and sanitation requests route to launch specialists',()=>{
 assert.equal(routeTask('sports moneyline injuries odds').recommended[0].id,'sports-guru');
 assert.equal(routeTask('sanitation ssop staffing').recommended[0].id,'sanitation-regional');
 assert.equal(routeTask('coding debug offline').recommended[0].id,'coding-execution');
});
test('AI authorship reviewer does not claim certain AI detection',()=>{
 const p=specialistById('al-detector');
 assert.match(p.verification,/cannot be reliably determined/);
});
