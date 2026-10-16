import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectExecutorSchema} from '../lib/executor-schema-readiness.mjs';
const tables=['team_tasks','team_approval_audit','team_execution_receipts'];
const cols=['state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence','blocker_reason'];
const mock=(t=tables,c=cols)=>({prepare(sql){return {all:async()=>({results:sql.startsWith('PRAGMA')?c.map(name=>({name})):t.map(name=>({name}))})}}});
test('no database is not executor ready',async()=>assert.equal((await inspectExecutorSchema()).ready,false));
test('missing receipt tables block execution readiness',async()=>{
 const r=await inspectExecutorSchema(mock(['team_tasks']));
 assert.equal(r.ready,false);assert.ok(r.missing.includes('team_execution_receipts'));
});
test('missing lease or blocker columns block execution readiness',async()=>{
 const r=await inspectExecutorSchema(mock(tables,['state','owner_approved']));
 assert.equal(r.ready,false);assert.ok(r.missingColumns.includes('lease_token'));
});
test('all required table and column names permit schema readiness only',async()=>{
 const r=await inspectExecutorSchema(mock());
 assert.equal(r.ready,true);
});
