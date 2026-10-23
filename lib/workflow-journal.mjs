import {createHash} from 'node:crypto';
const types=new Set(['workflow.created','step.planned','step.reviewed','workflow.cancelled']);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export function createJournal(workflowId){
 if(typeof workflowId!=='string'||!/^[0-9a-f]{20}$/.test(workflowId))throw Error('invalid_workflow_id');
 return {schema:'atlas.workflow.journal.v1',workflowId,entries:[],headHash:'GENESIS'};
}
export function appendJournalEvent(journal,event){
 const snapshot=replayWorkflowJournal(journal);
 if(!event||typeof event!=='object'||!types.has(event.type)||typeof event.idempotencyKey!=='string'||!event.idempotencyKey.trim()||event.idempotencyKey.length>128)throw Error('invalid_event');
 if(!event.payload||typeof event.payload!=='object'||Array.isArray(event.payload))throw Error('invalid_payload');
 const old=journal.entries.find(x=>x.idempotencyKey===event.idempotencyKey);
 if(old){
  if(old.type!==event.type||hash(old.payload)!==hash(event.payload))throw Error('idempotency_conflict');
  return {journal,replayed:true};
 }
 if(snapshot.cancelled)throw Error('workflow_cancelled');
 if(event.type==='workflow.created'&&snapshot.created)throw Error('already_created');
 if(event.type!=='workflow.created'&&!snapshot.created)throw Error('workflow_not_created');
 if(event.type==='step.planned'||event.type==='step.reviewed'){
  if(typeof event.payload.stepId!=='string'||!/^[a-z][a-z0-9-]{0,63}$/.test(event.payload.stepId))throw Error('invalid_step_id');
  if(event.payload.stepId==='approval'&&event.type==='step.reviewed')throw Error('owner_approval_not_supported');
  if(event.type==='step.planned'&&snapshot.steps[event.payload.stepId])throw Error('step_already_planned');
  if(event.type==='step.reviewed'&&snapshot.steps[event.payload.stepId]!=='planned')throw Error('step_not_planned');
 }
 const entry={sequence:journal.entries.length+1,type:event.type,idempotencyKey:event.idempotencyKey,payload:structuredClone(event.payload),previousHash:journal.headHash};
 entry.hash=hash(entry);
 const next={...journal,entries:[...journal.entries,entry],headHash:entry.hash};
 replayWorkflowJournal(next);
 return {journal:next,replayed:false};
}
export function replayWorkflowJournal(journal){
 if(journal?.schema!=='atlas.workflow.journal.v1'||!Array.isArray(journal.entries)||journal.entries.length>10000)throw Error('invalid_journal');
 let prev='GENESIS',created=false,cancelled=false;
 const steps=Object.create(null),seen=new Set();
 for(let i=0;i<journal.entries.length;i++){
  const e=journal.entries[i];
  if(e.sequence!==i+1||e.previousHash!==prev||hash({sequence:e.sequence,type:e.type,idempotencyKey:e.idempotencyKey,payload:e.payload,previousHash:e.previousHash})!==e.hash)throw Error('journal_integrity_failed');
  if(!types.has(e.type)||seen.has(e.idempotencyKey)||cancelled)throw Error('journal_transition_invalid');
  seen.add(e.idempotencyKey);prev=e.hash;
  if(e.type==='workflow.created'){if(created)throw Error('journal_transition_invalid');created=true}
  else if(!created)throw Error('journal_transition_invalid');
  else if(e.type==='workflow.cancelled')cancelled=true;
  else if(e.type==='step.planned'){if(typeof e.payload?.stepId!=='string'||steps[e.payload.stepId])throw Error('journal_transition_invalid');steps[e.payload.stepId]='planned'}
  else if(e.type==='step.reviewed'){if(e.payload?.stepId==='approval'||steps[e.payload?.stepId]!=='planned')throw Error('journal_transition_invalid');steps[e.payload.stepId]='reviewed'}
 }
 if(prev!==journal.headHash)throw Error('journal_integrity_failed');
 return {workflowId:journal.workflowId,created,cancelled,steps:{...steps},eventCount:journal.entries.length,integrityVerified:true,executionEnabled:false,approved:false,databasePersisted:false};
}
