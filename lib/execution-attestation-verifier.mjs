// Read-only execution attestation policy. This function cannot execute, approve,
// reserve, retry, or mutate a certification task.
const KEY=/^[A-Za-z0-9_.:-]{8,128}$/;
const HISTORICAL_BLOCKED=new Set(['cert-github-read-20261018','cert-github-read-20261019-v2']);
export async function verifyExecutionAttestation(proof,{inspectTask,inspectLedger,inspectApproval,inspectReceipt,inspectReplayDenial}={}){
 const denied={verified:false};
 if(!proof||!['real-read-adapter','approved-write-adapter','persona-e2e'].includes(proof.requirement)
    ||!KEY.test(proof.taskId||'')||!KEY.test(proof.stepId||'')
    ||!KEY.test(proof.idempotencyKey||'')||!KEY.test(proof.receiptId||'')
    ||HISTORICAL_BLOCKED.has(proof.taskId))return denied;
 if([inspectTask,inspectLedger,inspectApproval,inspectReceipt,inspectReplayDenial].some(fn=>typeof fn!=='function'))return denied;
 try{
  // Every lookup is read-only and bound to exactly the same task and step.
  const scope=Object.freeze({taskId:proof.taskId,stepId:proof.stepId,idempotencyKey:proof.idempotencyKey,receiptId:proof.receiptId});
  const [task,ledger,approval,receipt,replay]=await Promise.all([
   inspectTask(scope),inspectLedger(scope),inspectApproval(scope),inspectReceipt(scope),inspectReplayDenial(scope)
  ]);
  if(task?.taskId!==scope.taskId||task?.stepId!==scope.stepId||task?.state!=='completed'
    ||ledger?.found!==true||ledger?.state!=='confirmed'||ledger?.receiptPresent!==true
    ||ledger?.taskId!==scope.taskId||ledger?.stepId!==scope.stepId
    ||approval?.taskId!==scope.taskId||approval?.stepId!==scope.stepId
    ||approval?.approved!==true||approval?.ownerAuthenticated!==true
    ||approval?.approvedBeforeExecution!==true
    ||receipt?.taskId!==scope.taskId||receipt?.stepId!==scope.stepId
    ||receipt?.receiptId!==scope.receiptId||receipt?.durable!==true
    ||replay?.taskId!==scope.taskId||replay?.stepId!==scope.stepId
    ||replay?.denied!==true)return denied;
  // A receipt alone proves neither the requested tool nor the workflow dependency.
  const expected=proof.requirement==='real-read-adapter'?'github.read'
   :proof.requirement==='approved-write-adapter'?'github.write':null;
  if(expected&&(task.tool!==expected||receipt.tool!==expected))return denied;
  if(proof.requirement==='persona-e2e'
     &&(task.dependentWorkflowVerified!==true||task.personaCount<2))return denied;
  return {verified:true,taskId:scope.taskId,receiptId:scope.receiptId};
 }catch{return denied}
}
