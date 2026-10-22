// Read-only chain audit: signed artifacts alone do not establish real authorization.
// This function checks trusted source identity and chronological provenance without
// granting permissions, running tools, or changing a task.
import {parseAuditInstant} from './audit-chronology.mjs';
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const blocked=new Set(['cert-github-read-20261018','cert-github-read-20261019-v2']);
export async function validateSignedObservationChain({scope,approval,replay,ledger,expectedCommit}={}){
 const fail=Object.freeze({verified:false});
 if(!scope||blocked.has(scope.taskId)||![scope.taskId,scope.stepId,scope.idempotencyKey].every(x=>ID.test(x||''))
  ||!/^[a-f0-9]{40}$/.test(expectedCommit||''))return fail;
 if(approval?.sourceVerified!==true||replay?.sourceVerified!==true
  ||approval.taskId!==scope.taskId||approval.stepId!==scope.stepId
  ||replay.taskId!==scope.taskId||replay.stepId!==scope.stepId
  ||replay.idempotencyKey!==scope.idempotencyKey
  ||approval.deploymentCommit!==expectedCommit||replay.deploymentCommit!==expectedCommit
  ||!ID.test(approval.originSourceId||'')||!ID.test(replay.originSourceId||'')
  ||!ID.test(approval.originEventId||'')||!ID.test(replay.originEventId||'')
  ||approval.originEventId===replay.originEventId
  ||approval.ownerAuthenticated!==true||replay.denied!==true
  ||ledger?.state!=='confirmed'||ledger?.taskId!==scope.taskId||ledger?.stepId!==scope.stepId)return fail;
 const approved=parseAuditInstant(approval.approvedAt),reserved=parseAuditInstant(ledger.reservedAt),
  denied=parseAuditInstant(replay.replayObservedAt);
 if(![approved,reserved,denied].every(Number.isFinite)||!(approved<reserved&&reserved<denied))return fail;
 return {verified:true};
}
