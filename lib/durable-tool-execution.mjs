import {authorizeToolStep} from './tool-execution-policy.mjs';
import {executeAuthorizedToolStep} from './authorized-tool-runner.mjs';
import {reserveToolAction,recordToolActionOutcome} from './d1-tool-action-ledger.mjs';
// D1-backed execution boundary: reserve before a possible external effect.
// Ambiguous results never trigger automatic replay.
export async function executeDurableToolStep({db,taskId,stepId,step,approval,adapters,timeoutMs,onStage}={}){
 if(!step||!approval)throw new TypeError('missing_step_or_approval');
 if(typeof onStage==='function')onStage('authorization');
 const decision=authorizeToolStep({taskApproved:approval?.taskApproved,allowedTools:approval?.allowedTools,grantedCapabilities:approval?.grantedCapabilities,confirmation:approval?.confirmation,persona:step.persona,tool:step.tool,capability:step.capability,idempotencyKey:step.idempotencyKey});
 if(!decision.allowed)return {ok:false,status:'denied',reason:decision.reason,executed:false};
 if(typeof step.idempotencyKey!=='string'||!step.idempotencyKey)
  return {ok:false,status:'denied',reason:'idempotency_key_required',executed:false};
 if(typeof onStage==='function')onStage('reservation');
 const reservation=await reserveToolAction(db,{taskId,stepId,idempotencyKey:step.idempotencyKey});
 if(!reservation.reserved)return {ok:false,status:reservation.status,executed:false,reason:'not_safe_to_replay'};
 if(typeof onStage==='function')onStage('adapter_call');
 const outcome=await executeAuthorizedToolStep({step,approval,adapters,timeoutMs});
 // Even a local adapter result must be persisted before confirmation is returned.
 if(typeof onStage==='function')onStage('receipt_write');
 const recorded=await recordToolActionOutcome(db,{
  taskId,stepId,idempotencyKey:step.idempotencyKey,
  confirmed:outcome.ok===true,receiptId:outcome.receiptId,evidence:outcome.evidence
 });
 if(!recorded.recorded)return {ok:false,status:'needs-reconciliation',reason:'outcome_persistence_failed',executed:outcome.executed};
 if(!outcome.ok)return {...outcome,status:'needs-reconciliation'};
 return {...outcome,durable:true};
}
