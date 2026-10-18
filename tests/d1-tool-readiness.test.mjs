import test from 'node:test';import assert from 'node:assert/strict';import {inspectTeamDatabase} from '../lib/d1-readiness.mjs';
const base=['team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery'];
function db(names){return {prepare(){return {all:async()=>({results:names.map(name=>({name}))})}}}}
test('new migrations appear in separate tool schema readiness',async()=>{const r=await inspectTeamDatabase(db([...base,'team_tool_action_ledger','team_tool_step_grants']));assert.equal(r.schemaVerified,true);assert.equal(r.toolSchemaVerified,true)});
test('missing grant table blocks tool schema only',async()=>{const r=await inspectTeamDatabase(db([...base,'team_tool_action_ledger']));assert.equal(r.schemaVerified,true);assert.equal(r.toolSchemaVerified,false)});
