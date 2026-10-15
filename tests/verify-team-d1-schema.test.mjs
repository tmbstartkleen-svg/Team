import test from 'node:test';import assert from 'node:assert/strict';import {verifyTeamD1Schema} from '../scripts/verify-team-d1-schema.mjs';
const tableNames=['team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery'];
const columns=['lease_token','lease_until','attempt_count','completion_evidence','blocker_reason','blocker_updated_at'];
const data=x=>[{success:true,results:x.map(name=>({name}))}];
test('verifies complete TEAM migration schema',()=>assert.equal(verifyTeamD1Schema(data(tableNames),data(columns)).ok,true));
test('blocks missing migrations and task columns',()=>{const r=verifyTeamD1Schema(data(tableNames.slice(0,2)),data(columns.slice(0,1)));assert.equal(r.ok,false);assert.ok(r.missingTables.includes('team_messages'));assert.ok(r.missingColumns.includes('blocker_reason'))});
test('rejects D1 query errors',()=>assert.throws(()=>verifyTeamD1Schema([{success:false,results:[]}],data(columns))));
