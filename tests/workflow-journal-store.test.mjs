import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkflowJournalStore} from '../lib/workflow-journal-store.mjs';
import {verifyStoredWorkflow} from '../lib/workflow-journal-validation.mjs';
const id='1234567890abcdef1234';
function fakePool(){
 const rows=new Map(),calls=[];
 const exec=async(sql,params=[])=>{
  calls.push(sql);
  if(sql.startsWith('SELECT')){const row=rows.get(params[0]);return {rows:row?[structuredClone(row)]:[],rowCount:row?1:0}}
  if(sql.startsWith('INSERT')){
   if(rows.has(params[0]))return {rows:[],rowCount:0};
   rows.set(params[0],{version:1,journal:JSON.parse(params[1])});return {rows:[{version:1}],rowCount:1};
  }
  if(sql.startsWith('UPDATE')){
   const row=rows.get(params[1]);
   if(row.version!==params[2])return {rows:[],rowCount:0};
   row.version++;row.journal=JSON.parse(params[0]);return {rows:[{version:row.version}],rowCount:1};
  }
  return {rows:[],rowCount:0};
 };
 return {calls,rows,pool:{query:exec,connect:async()=>({query:exec,release(){}})}};
}
test('staging adapter persists a versioned journal through parameterized transaction calls',async()=>{
 const db=fakePool(),store=createWorkflowJournalStore(db.pool);
 const created=await store.append(id,{type:'workflow.created',idempotencyKey:'created',payload:{title:'Draft report'}},{expectedVersion:0});
 assert.equal(created.version,1);assert.equal(created.replayed,false);
 const later=await store.append(id,{type:'step.planned',idempotencyKey:'plan',payload:{stepId:'research'}},{expectedVersion:1});
 assert.equal(later.version,2);
 const loaded=await store.read(id);
 assert.equal(loaded.version,2);assert.equal(verifyStoredWorkflow(loaded).auditChainValid,true);
 assert.ok(db.calls.includes('BEGIN'));assert.ok(db.calls.includes('COMMIT'));
});
test('version mismatch and approvals fail closed, transaction rolls back',async()=>{
 const db=fakePool(),store=createWorkflowJournalStore(db.pool);
 await store.append(id,{type:'workflow.created',idempotencyKey:'created',payload:{}},{expectedVersion:0});
 await assert.rejects(()=>store.append(id,{type:'step.planned',idempotencyKey:'plan',payload:{stepId:'qa'}},{expectedVersion:0}),/workflow_version_conflict/);
 await assert.rejects(()=>store.append(id,{type:'step.reviewed',idempotencyKey:'approve',payload:{stepId:'approval'}},{expectedVersion:1}));
 assert.ok(db.calls.includes('ROLLBACK'));
});
test('replay with same idempotency key does not advance version',async()=>{
 const db=fakePool(),store=createWorkflowJournalStore(db.pool);
 const event={type:'workflow.created',idempotencyKey:'created',payload:{}};
 await store.append(id,event,{expectedVersion:0});
 const repeat=await store.append(id,event,{expectedVersion:1});
 assert.equal(repeat.replayed,true);assert.equal(repeat.version,1);
 await assert.rejects(()=>store.append(id,{...event,payload:{changed:true}},{expectedVersion:1}),/idempotency_conflict/);
});
