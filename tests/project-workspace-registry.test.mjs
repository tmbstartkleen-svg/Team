import test from 'node:test';
import assert from 'node:assert/strict';
import {PROJECT_WORKSPACES,listProjectWorkspaces,buildWorkspaceAssignment} from '../lib/project-workspace-registry.mjs';
test('unified registry preserves all 15 source repositories',()=>{
 assert.equal(PROJECT_WORKSPACES.length,15);
 assert.equal(new Set(PROJECT_WORKSPACES.map(p=>p.repo)).size,15);
 for(const p of listProjectWorkspaces()){assert.equal(p.canExecute,false);assert.equal(p.canDelete,false);assert.equal(p.connection,'not_independently_verified');}
});
test('security workspace remains independent with dedicated lead',()=>{const p=listProjectWorkspaces('security');assert.equal(p.length,1);assert.equal(p[0].repo,'tmbstartkleen-svg/Safeguard');assert.equal(p[0].leader,'cybersecurity-lead');assert.equal(p[0].canDelete,false);});
test('sports workspaces are grouped but not migrated',()=>{
 const sports=listProjectWorkspaces('sports');
 assert.equal(sports.length,5);
 assert.ok(sports.every(p=>p.leader==='sports-guru'));
});
test('assignment is proposal-only and requires approved lead',()=>{
 const r=buildWorkspaceAssignment({projectId:'edgeforce',specialistId:'sports-guru',taskTitle:'Research independent market providers'});
 assert.equal(r.ok,true);assert.equal(r.executionStarted,false);assert.equal(r.ownerApprovalRequired,true);
 assert.equal(buildWorkspaceAssignment({projectId:'edgeforce',specialistId:'mba',taskTitle:'Research market providers'}).ok,false);
 assert.equal(buildWorkspaceAssignment({projectId:'missing',specialistId:'mba',taskTitle:'Perform unknown actions'}).ok,false);
});
