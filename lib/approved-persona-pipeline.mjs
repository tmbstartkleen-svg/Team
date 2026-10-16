import {loadApprovedTaskContext} from './approved-task-context.mjs';
import {claimApprovedTask,blockClaimedTask} from './d1-task-queue.mjs';
import {verifyTaskWithReceipt} from './d1-execution-receipts.mjs';
import {generateApprovedPersonaAnalysis} from './cloudflare-persona-provider.mjs';
import {generateWorkersPersonaAnalysis} from './workers-ai-persona-provider.mjs';

// Internal-only executor. Caller must authenticate an authorized service identity.
// No route calls this module until the dedicated D1 schema and service identity are certified.
export async function executeApprovedPersonaTask({db,taskId,leaseToken,receiptId,leaseUntil,persona,taskTitle,fetcher,apiKey,model,ai,provider}){
 if(!db?.prepare||!db?.batch||typeof taskId!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(taskId))throw new TypeError('invalid_executor_context');
 if(typeof leaseToken!=='string'||leaseToken.length<16||typeof receiptId!=='string'||receiptId.length<8)throw new TypeError('invalid_executor_identity');
 // Claim is atomic and checks both owner approval and queued state.
 const persisted=await loadApprovedTaskContext(db,taskId);
 if(!persisted)return {ok:false,state:'not_claimed',reason:'not_approved_or_not_queued'};
 const claimed=await claimApprovedTask(db,{id:taskId,leaseToken,leaseUntil});
 if(!claimed)return {ok:false,state:'not_claimed',reason:'not_approved_or_not_queued'};
 try{
  const analysis=provider==='cloudflare'?await generateWorkersPersonaAnalysis({ai,persona:persisted.persona,task:persisted.taskTitle}):await generateApprovedPersonaAnalysis({fetcher,apiKey,model,persona:persisted.persona,task:persisted.taskTitle});
  const evidence='AI analysis generated; request '+(analysis.requestId||'unavailable')+'. '+analysis.text;
  // Limit audit data; never claim tool action or independently verified external effects.
  const receipt=await verifyTaskWithReceipt(db,{taskId,leaseToken,receiptId,evidence:evidence.slice(0,2000)});
  return {ok:true,state:'verified',receiptId:receipt.receiptId,outputType:'analysis-only',externalActionsPerformed:false};
 }catch(error){
  // Failure must not become success. Any failed blocking operation is surfaced.
  await blockClaimedTask(db,{id:taskId,leaseToken,reason:'execution-error'});
  return {ok:false,state:'blocked',reason:'provider_or_receipt_failure'};
 }
}
