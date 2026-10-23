#!/usr/bin/env node
import {buildWorkforceSimulation} from '../lib/workforce-simulation.mjs';
import {createJournal,appendJournalEvent,replayWorkflowJournal} from '../lib/workflow-journal.mjs';
try {
 const workflow=buildWorkforceSimulation({title:process.argv.slice(2).join(' ')});
 let journal=createJournal(workflow.id);
 journal=appendJournalEvent(journal,{type:'workflow.created',idempotencyKey:'create',payload:{title:workflow.title}}).journal;
 for(const node of workflow.nodes.filter(x=>x.id!=='approval')){
  journal=appendJournalEvent(journal,{type:'step.planned',idempotencyKey:'plan:'+node.id,payload:{stepId:node.id}}).journal;
 }
 console.log(JSON.stringify({journal,recovery:replayWorkflowJournal(journal),note:'in-memory demonstration only; no database or model call'},null,2));
}catch(e){console.error(e.message);process.exitCode=2}
