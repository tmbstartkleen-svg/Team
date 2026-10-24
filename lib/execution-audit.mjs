import {createHash} from 'node:crypto';
export function createPreparationReceipt(contract,authorization){
 if(contract?.schema!=='atlas.execution.contract.v1'||authorization?.schema!=='atlas.execution.authorization.v1')throw Error('invalid_receipt_input');
 const receipt={schema:'atlas.execution.preparation-receipt.v1',workflowId:contract.workflowId,
  contractDigest:contract.digest,capability:authorization.capability,
  planPermitted:authorization.permittedForPlanning,executionAuthorized:false,
  outcome:'dry-run-only',sideEffects:0,recordPersisted:false};
 return {...receipt,fingerprint:createHash('sha256').update(JSON.stringify(receipt)).digest('hex')};
}
