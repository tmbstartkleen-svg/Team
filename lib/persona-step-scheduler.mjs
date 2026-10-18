// Deterministic dependency-aware scheduler. It proposes work; it does not bypass
// owner authorization, call tools, or mark tasks complete.
const STATES=new Set(['queued','running','blocked','verified','failed']);
const ID=/^[A-Za-z0-9_-]{1,128}$/;
export function selectReadyPersonaSteps(steps,{maxParallel=3}={}){
 if(!Array.isArray(steps)||steps.length>100||!Number.isInteger(maxParallel)||maxParallel<1||maxParallel>10)
  throw new TypeError('invalid_persona_schedule');
 const ids=new Set();
 for(const s of steps){
  if(!s||!ID.test(s.id)||ids.has(s.id)||!ID.test(s.persona)||!STATES.has(s.state)||
    !Array.isArray(s.dependsOn)||s.dependsOn.length>100||!s.dependsOn.every(d=>typeof d==='string'&&ID.test(d)))
   throw new TypeError('invalid_persona_step');
  ids.add(s.id);
 }
 const byId=new Map(steps.map(s=>[s.id,s]));
 for(const s of steps)for(const d of s.dependsOn)if(!byId.has(d)||d===s.id)throw new TypeError('invalid_step_dependency');
 // Reject cycles even if every step is currently blocked or running.
 const visited=new Set(),active=new Set();
 function visit(id){if(active.has(id))throw new TypeError('cyclic_step_dependency');if(visited.has(id))return;
  active.add(id);for(const d of byId.get(id).dependsOn)visit(d);active.delete(id);visited.add(id);}
 for(const s of steps)visit(s.id);
 const ready=[],blocked=[],waiting=[];
 for(const s of steps){
  if(s.state!=='queued')continue;
  const dependencies=s.dependsOn.map(d=>byId.get(d));
  if(dependencies.some(d=>d.state==='failed'||d.state==='blocked'))blocked.push({id:s.id,reason:'dependency_blocked'});
  else if(dependencies.every(d=>d.state==='verified')&&s.ownerApproved===true)ready.push({id:s.id,persona:s.persona});
  else waiting.push({id:s.id,reason:s.ownerApproved===true?'dependency_pending':'owner_approval_required'});
 }
 return {ready:ready.slice(0,maxParallel),deferred:ready.slice(maxParallel),blocked,waiting,allVerified:steps.length>0&&steps.every(s=>s.state==='verified')};
}
