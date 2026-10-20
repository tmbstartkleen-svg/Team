// Pure recovery decisions for persisted tasks. No autonomous runner is active.
export function recoverInterruptedTask(task,{now=Date.now(),leaseMs=300000}={}){
 if(!task||typeof task!=='object'||!['queued','running','blocked','verification','verified','failed'].includes(task.state))throw new TypeError('invalid_task');
 if(task.state!=='running')return {action:'none',task:{...task},requiresOwnerApproval:false};
 const heartbeat=Date.parse(task.lastHeartbeat||'');
 if(!Number.isFinite(heartbeat)||!Number.isFinite(now)||!Number.isFinite(leaseMs)||leaseMs<1000)throw new TypeError('invalid_lease');
 if(heartbeat>now+60000)throw new TypeError('invalid_lease');
 if(now-heartbeat<leaseMs)return {action:'none',task:{...task},requiresOwnerApproval:false};
 return {action:'pause-for-review',task:{...task,state:'blocked',complete:false,blockerReason:'Worker lease expired; verify side effects before retry',lastHeartbeat:null},requiresOwnerApproval:true};
}
export function resumeRecoveredTask(task,{ownerApproved=false,reconciled=false}={}){
 if(task?.state!=='blocked'||task.blockerReason!=='Worker lease expired; verify side effects before retry')throw new TypeError('not_recoverable');
 if(!ownerApproved||!reconciled)throw new Error('review_and_owner_approval_required');
 return {...task,state:'queued',blockerReason:null,complete:false};
}
