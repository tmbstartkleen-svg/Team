import test from 'node:test';import assert from 'node:assert/strict';import {classifyTeamD1Databases} from '../lib/team-d1-discovery.mjs';const id='11111111-2222-4333-8444-555555555555';
test('unrelated databases do not count as TEAM storage',()=>assert.equal(classifyTeamD1Databases([{name:'santera-db',uuid:id},{name:'edgeforce-intelligence',uuid:id}]).status,'create'));
test('canonical dedicated D1 can be reused',()=>assert.equal(classifyTeamD1Databases([{name:'atlas-team-data',uuid:id}]).status,'reuse'));
test('existing atlas-team D1 needs review',()=>assert.equal(classifyTeamD1Databases([{name:'atlas-team',uuid:id}]).status,'review_existing'));
test('invalid or ambiguous listing fails closed',()=>{assert.throws(()=>classifyTeamD1Databases({}));assert.throws(()=>classifyTeamD1Databases([{name:'atlas-team-data',uuid:'not-id'}]))});
