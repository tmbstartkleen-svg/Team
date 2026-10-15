// Pure task lifecycle rules. Persistence and background workers require configured infrastructure.
const VALID=new Set(['queued','running','blocked','verification','verified','failed']);
const NEXT={queued:['running','blocked'],running:['blocked','verification','failed'],blocked:['queued','failed'],verification:['running','verified','blocked'],verified:[],failed:['queued']};
export function transitionTask(task,next,{ownerApproved=false,evidence=null,resolution=null}={}){
 if(!task||!VALID.has(task.state)||!VALID.has(next)||!NEXT[task.state].includes(next))throw new TypeError('invalid_task_transition');
 if(next==='running'&&!ownerApproved)throw new Error('owner_approval_required');
 if(task.state==='blocked'&&next==='queued'&&(!resolution||typeof resolution!=='string'||!resolution.trim()))throw new Error('blocker_resolution_required');
 if(next==='verified'&&(!evidence||typeof evidence!=='string'||evidence.trim().length<8))throw new Error('verification_evidence_required');
 return {...task,state:next,lastEvidence:next==='verified'?evidence:task.lastEvidence||null,blockerResolution:task.state==='blocked'?resolution||null:task.blockerResolution||null,complete:next==='verified'};
}
