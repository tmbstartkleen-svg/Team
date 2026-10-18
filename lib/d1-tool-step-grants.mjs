// Resolve trusted tool grants exclusively from D1, never request JSON.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
export async function loadPersistedToolGrant(db,{taskId,stepId}={}){
 if(!db?.prepare||!ID.test(taskId)||!ID.test(stepId))throw new TypeError('invalid_grant_lookup');
 const row=await db.prepare(`SELECT g.task_id,g.step_id,g.persona,g.tool,g.capability,g.target_json,
 g.idempotency_key,g.confirmation,t.owner_approved,t.state,t.assigned_persona
 FROM team_tool_step_grants g JOIN team_tasks t ON t.id=g.task_id
 WHERE g.task_id=? AND g.step_id=? AND g.enabled=1`).bind(taskId,stepId).first();
 if(!row||row.owner_approved!==1||row.state!=='queued'||row.assigned_persona!==row.persona)return null;
 let target;try{target=JSON.parse(row.target_json)}catch{return null}
 if(!target||typeof target!=='object'||Array.isArray(target)||!ID.test(row.idempotency_key))return null;
 return {ownerApproved:true,step:{persona:row.persona,tool:row.tool,capability:row.capability,
  target,idempotencyKey:row.idempotency_key},approval:{taskApproved:true,allowedTools:[row.tool],
  grantedCapabilities:[row.capability],confirmation:row.confirmation===1}};
}
