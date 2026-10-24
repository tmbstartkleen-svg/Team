import {replayWorkflowJournal} from './workflow-journal.mjs';
export function verifyStoredWorkflow(row){
 if(!row||!row.journal||!Number.isSafeInteger(Number(row.version)))throw Error('invalid_stored_workflow');
 const state=replayWorkflowJournal(row.journal);
 if(state.eventCount!==Number(row.version))throw Error('workflow_version_mismatch');
 return {workflowId:state.workflowId,version:Number(row.version),
   auditChainValid:true,executionEnabled:false,approvalGranted:false,
   databaseWritePerformed:false,steps:state.steps};
}
