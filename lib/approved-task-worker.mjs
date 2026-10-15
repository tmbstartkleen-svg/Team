import {claimApprovedTask,verifyClaimedTask,blockClaimedTask} from './d1-task-queue.mjs';
// Invoked only from a separately authenticated and authorized server runtime.
// This does not schedule or run automatically.
export async function processApprovedTask(db,{taskId,leaseToken,leaseUntil,executor,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_worker_required');
 if(typeof executor!=='function')throw new TypeError('executor_required');
 const claim=await claimApprovedTask(db,{id:taskId,leaseToken,leaseUntil});
 if(!claim)return {status:'not-claimed',executed:false};
 try{
  const result=await executor({taskId,attempt:claim.attempt_count});
  if(!result||result.verified!==true||typeof result.evidence!=='string'||result.evidence.trim().length<8){
   const blocked=await blockClaimedTask(db,{id:taskId,leaseToken,reason:'needs-review'});
   return {status:blocked?'blocked-for-review':'review-persistence-failed',executed:true,verified:false};
  }
  const verified=await verifyClaimedTask(db,{id:taskId,leaseToken,evidence:result.evidence});
  if(!verified){const blocked=await blockClaimedTask(db,{id:taskId,leaseToken,reason:'verification-rejected'});return {status:blocked?'blocked-for-review':'review-persistence-failed',executed:true,verified:false}}
  return {status:'verified',executed:true,verified:true};
 }catch{
  try{const blocked=await blockClaimedTask(db,{id:taskId,leaseToken,reason:'execution-error'});return {status:blocked?'blocked-for-review':'review-persistence-failed',executed:true,verified:false}}
  catch{return {status:'review-persistence-failed',executed:true,verified:false}}
 }
}
