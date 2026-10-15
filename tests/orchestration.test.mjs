import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPlan} from '../lib/orchestration.mjs';
import plan from '../api/plan.js';
test('plans never claim autonomous work',()=>{const p=buildPlan('Deliver an offline-first workforce platform');assert.equal(p.executed,false);assert.ok(p.stages.every(s=>s.execution==='not-started'&&s.approval==='required'))});
test('stage dependencies reference existing stages',()=>{const p=buildPlan('Design and deploy an enterprise dashboard',{maxStages:4});const ids=new Set(p.stages.map(s=>s.id));assert.ok(p.stages.every(s=>s.dependsOn.every(id=>ids.has(id))))});
test('invalid goals rejected',()=>assert.throws(()=>buildPlan('short')));
test('planner endpoint is private',()=>{const out={code:200};const res={setHeader(){},status(n){out.code=n;return this},json(v){out.body=v;return this}};plan({method:'POST',headers:{'content-type':'application/json'},body:{goal:'Build a team management platform'}},res);assert.equal(out.code,401)});
