import test from 'node:test';
import assert from 'node:assert/strict';
import {createJournal,appendJournalEvent,replayWorkflowJournal} from '../lib/workflow-journal.mjs';
const id='1234567890abcdef1234';
const event=(type,idempotencyKey,payload={})=>({type,idempotencyKey,payload});
test('journal creation and deterministic recovery are local and fail closed',()=>{
 let j=createJournal(id);
 j=appendJournalEvent(j,event('workflow.created','once',{title:'Research task'})).journal;
 j=appendJournalEvent(j,event('step.planned','p1',{stepId:'research'})).journal;
 j=appendJournalEvent(j,event('step.reviewed','r1',{stepId:'research'})).journal;
 const state=replayWorkflowJournal(JSON.parse(JSON.stringify(j)));
 assert.equal(state.steps.research,'reviewed');assert.equal(state.approved,false);
 assert.equal(state.executionEnabled,false);assert.equal(state.databasePersisted,false);
 const duplicate=appendJournalEvent(j,event('step.reviewed','r1',{stepId:'research'}));
 assert.equal(duplicate.replayed,true);assert.equal(duplicate.journal.entries.length,3);
 assert.throws(()=>appendJournalEvent(j,event('step.reviewed','r1',{stepId:'intake'})),/idempotency_conflict/);
});
test('tampered event chains and illegal approvals do not recover',()=>{
 let j=appendJournalEvent(createJournal(id),event('workflow.created','once',{title:'Sample'})).journal;
 assert.throws(()=>appendJournalEvent(j,event('step.reviewed','approve',{stepId:'approval'})));
 const tampered=structuredClone(j);tampered.entries[0].payload.title='tampered';
 assert.throws(()=>replayWorkflowJournal(tampered),/journal_integrity_failed/);
 j=appendJournalEvent(j,event('workflow.cancelled','cancel')).journal;
 assert.throws(()=>appendJournalEvent(j,event('step.planned','p1',{stepId:'research'})),/workflow_cancelled/);
});
