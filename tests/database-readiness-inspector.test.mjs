import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectDatabaseReadiness} from '../lib/database-readiness-inspector.mjs';
test('full schema and privileges pass with read-only SELECT statements',async()=>{
 const seen=[];const db={query:async sql=>{seen.push(sql);if(sql.includes('to_regclass'))return {rows:[{tasks:true,events:true,projects:true}]};if(sql.includes('has_table_privilege'))return {rows:[{tasks_insert:true,tasks_update:true,events_insert:true}]};return {rows:[]}}};
 const result=await inspectDatabaseReadiness(db);assert.equal(result.ok,true);assert.equal(result.status,200);assert.equal(seen.length,3);assert.ok(seen.every(x=>/^SELECT\b/i.test(x)));
});
test('missing schema or privileges fail closed',async()=>{
 const missing=await inspectDatabaseReadiness({query:async()=>({rows:[{tasks:true,events:false,projects:true}]})});assert.equal(missing.ok,false);assert.equal(missing.status,503);
 const noPrivilege=await inspectDatabaseReadiness({query:async sql=>sql.includes('to_regclass')?{rows:[{tasks:true,events:true,projects:true}]}:{rows:[{}]}});assert.equal(noPrivilege.ok,false);assert.equal(noPrivilege.writePrivilegesVerified,false);
 assert.equal((await inspectDatabaseReadiness(null)).ok,false);
});
