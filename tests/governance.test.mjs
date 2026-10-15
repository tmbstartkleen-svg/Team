import test from 'node:test';
import assert from 'node:assert/strict';
import {TEAM_GOVERNANCE,replicaProposal,ownerApprovalRequired} from '../lib/governance.mjs';
import {buildPlan} from '../lib/orchestration.mjs';
test('the human owner retains final authority',()=>{assert.equal(TEAM_GOVERNANCE.authority,'owner-final');assert.equal(ownerApprovalRequired('send-email'),true);assert.equal(ownerApprovalRequired('deploy'),true);assert.equal(ownerApprovalRequired('recommend'),false)});
test('replica creation is only a proposal',()=>{const p=replicaProposal('QA Engineer','Review all releases');assert.equal(p.status,'awaiting-owner-approval');assert.equal(p.canApproveOwnActions,false);assert.equal(p.inheritsGovernance,true)});
test('mission plans inherit owner approval policy',()=>{const plan=buildPlan('Build a Microsoft assignment monitor');assert.equal(plan.requiresHumanApproval,true);assert.equal(plan.finalAuthority,'human-project-owner');assert.equal(plan.replicationPolicy,'proposed-only')});
