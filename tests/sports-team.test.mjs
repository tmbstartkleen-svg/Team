import test from 'node:test';
import assert from 'node:assert/strict';
import {sportsTeamProposal,SPORTS_DIRECTOR,SPORTS_DESKS} from '../lib/sports-team.mjs';
test('sports director is dedicated and proposed with no fabricated identity',()=>{const x=sportsTeamProposal();assert.equal(x.director.dedicated,true);assert.equal(x.director.name,null);assert.equal(x.personasRunning,false);assert.equal(x.requestsForNamesSent,false);assert.equal(x.teamCreationApproved,false)});
test('sports desks cover major sports and market data quality',()=>{assert.ok(SPORTS_DESKS.length>=10);assert.ok(SPORTS_DESKS.some(x=>x.id==='soccer'));assert.ok(SPORTS_DESKS.some(x=>x.id==='markets-quality'));assert.ok(SPORTS_DESKS.every(x=>x.scope&&x.id))});
test('each desk invites name suggestions pending approval',()=>{const x=sportsTeamProposal();assert.ok(x.desks.every(d=>d.name===null&&d.namingPrompt.includes('What name')));assert.equal(x.replicationApproval.status,'awaiting-owner-approval')});
