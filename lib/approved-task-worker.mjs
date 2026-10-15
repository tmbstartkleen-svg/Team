import {claimApprovedTask,verifyClaimedTask} from './d1-task-queue.mjs';
// Invoked only from a separately authenticated and authorized server runtime.
// This does not schedule or run automatically.
export async function processApprovedTask(db,{taskId,leaseToken,leaseUntil,executor,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_worker_required');
 if(typeof executor!=='function')throw new TypeError('executor_required');
 const claim=await claimApprovedTask(db,{id:taskId,leaseToken,leaseUntil});
 if(!claim)return {status:'not-claimed',executed:false};
 try{
  const result=await executor({taskId,attempt:claim.attempt_count});
  if(!result||result.verified!==true||typeof result.evidence!=='string'||result.evidence.trim().length<8)
   return {status:'requires-review',executed:true,verified:false};
  const verified=await verifyClaimedTask(db,{id:taskId,leaseToken,evidence:result.evidence});
  return {status:verified?'verified':'verification-rejected',executed:true,verified:Boolean(verified)};
 }catch{
  return {status:'blocked-for-review',executed:true,verified:false};
 }
}
