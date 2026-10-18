import test from 'node:test';import assert from 'node:assert/strict';
import {assessTeamRelease,RELEASE_EVIDENCE_REQUIREMENTS as REQUIRED} from '../lib/team-release-certification.mjs';
test('missing evidence blocks release',()=>{const r=assessTeamRelease();assert.equal(r.launchReady,false);assert.equal(r.missing.length,REQUIRED.length)});
test('CI alone cannot certify launch',()=>{const r=assessTeamRelease({ci:{verified:true,reference:'GitHub Actions #123'}});assert.equal(r.launchReady,false);assert.ok(r.missing.includes('deployed-worker'))});
test('empty reference never satisfies live proof',()=>{const e=Object.fromEntries(REQUIRED.map(k=>[k,{verified:true,reference:'confirmed-proof'}]));e['owner-signoff'].reference='';assert.equal(assessTeamRelease(e).launchReady,false)});
test('all evidence is required and explicit',()=>{const e=Object.fromEntries(REQUIRED.map(k=>[k,{verified:true,reference:'confirmed-proof'}]));assert.equal(assessTeamRelease(e).status,'ready-for-owner-release')});
