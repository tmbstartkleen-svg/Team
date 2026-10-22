// Read-only provenance preflight against the existing immutable owner decision audit.
// Historical audit rows lack a step identity and cryptographic owner principal:
// this module deliberately NEVER issues a trusted signer observation.
const ID=/^[A-Za-z0-9_-]{1,128}$/;
const protectedTasks=new Set(['cert-github-read-20261018','cert-github-read-20261019-v2']);
export function createOwnerApprovalAuditPreflight(db){
 return async function inspect({taskId,stepId,idempotencyKey}={}){
  const blocked={eligible:false,originAuthenticated:false};
  if(!db?.prepare||![taskId,stepId,idempotencyKey].every(v=>typeof v==='string'&&ID.test(v))
      ||protectedTasks.has(taskId))return blocked;
  try{
   const grant=await db.prepare('SELECT task_id,step_id,idempotency_key,enabled,created_at FROM team_tool_step_grants WHERE task_id=? AND step_id=?').bind(taskId,stepId).first();
   if(!grant||grant.task_id!==taskId||grant.step_id!==stepId||grant.idempotency_key!==idempotencyKey||grant.enabled!==1)return blocked;
   const rows=await db.prepare('SELECT id,decision,actor,created_at FROM team_approval_audit WHERE task_id=? ORDER BY created_at ASC,id ASC LIMIT 2').bind(taskId).all();
   if(!Array.isArray(rows?.results)||rows.results.length!==1)return blocked;
   const row=rows.results[0];
   if(row?.decision!=='approved'||row?.actor!=='owner'||typeof row.created_at!=='string')return blocked;
   return {eligible:true,originAuthenticated:false,legacyAuditId:row.id,approvedAt:row.created_at,
     missing:['authenticated_owner_principal','step_scoped_approval','independent_source_signature']};
  }catch{return blocked}
 };
}
