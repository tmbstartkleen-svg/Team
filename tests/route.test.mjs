import test from 'node:test';
import assert from 'node:assert/strict';
import {routeTask,SPECIALISTS} from '../lib/route.mjs';
test('repo has distinct specialists',()=>assert.equal(new Set(SPECIALISTS.map(p=>p.id)).size,SPECIALISTS.length));
test('deployment selects ship',()=>assert.equal(routeTask('deploy vercel release').recommended[0].id,'ship'));
test('offline work selects offline',()=>assert.equal(routeTask('offline local fallback').recommended[0].id,'offline'));
test('unknown tasks report gap',()=>assert.equal(routeTask('xyzzy').coverageGap,true));
test('routing never claims work executed',()=>{const r=routeTask('code bug');assert.equal(r.execution,'not-started');assert.equal(r.requiresApproval,true)});
test('bounded recommendations',()=>assert.ok(routeTask('api security deploy release local model design quality budget integration',2).recommended.length<=2));
