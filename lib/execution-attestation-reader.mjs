import {createD1ExecutionInspectors} from './d1-execution-inspectors.mjs';
import {verifyExecutionAttestation} from './execution-attestation-verifier.mjs';

// No HTTP endpoint, approval action, state transition, or replay call.
// Only trusted, server-provided read-only inspectors may satisfy missing
// approval provenance and observed replay rejection.
export function createExecutionAttestationReader({db,approvalEvidence,replayEvidence,verifyChain}={}){
 const persisted=createD1ExecutionInspectors(db);
 const eligible=typeof approvalEvidence==='function'&&typeof replayEvidence==='function';
 return async function inspect(proof){
  if(!eligible||!db?.prepare)return {verified:false};
  const inspectApproval=async scope=>{
   const evidence=await approvalEvidence(scope);
   if(evidence?.kind!=='owner-authenticated-approval'
     ||evidence?.sourceVerified!==true
     ||evidence?.taskId!==scope.taskId||evidence?.stepId!==scope.stepId
     ||evidence?.ownerAuthenticated!==true||evidence?.approvedBeforeExecution!==true
     ||evidence?.approved!==true)return {};
   return evidence;
  };
  const inspectReplayDenial=async scope=>{
   const evidence=await replayEvidence(scope);
   if(evidence?.kind!=='observed-replay-denial'
     ||evidence?.sourceVerified!==true
     ||evidence?.taskId!==scope.taskId||evidence?.stepId!==scope.stepId
     ||evidence?.idempotencyKey!==scope.idempotencyKey||evidence?.denied!==true)return {};
   return evidence;
  };
  const wrappedApproval=async scope=>{
   const approval=await inspectApproval(scope);
   if(typeof verifyChain!=='function')return approval;
   const replay=await inspectReplayDenial(scope);
   const ledger=await persisted.inspectLedger(scope);
   const chain=await verifyChain({scope,approval,replay,ledger});
   return chain?.verified===true?approval:{};
  };
  return verifyExecutionAttestation(proof,{...persisted,inspectApproval:wrappedApproval,inspectReplayDenial});
 };
}
