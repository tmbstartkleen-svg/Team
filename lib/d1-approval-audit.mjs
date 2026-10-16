// Require an authorized server-side owner before calling. One D1 batch transaction
// couples state mutation with the audit receipt; failed updates leave no decision.
export async function recordOwnerDecision(db,{taskId,decision,reason,auditId}){
 if(!db?.batch||!db?.prepare||typeof taskId!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(taskId)||!['approved','rejected'].includes(decision)||typeof reason!=='string'||reason.trim().length<8||reason.length>500||typeof auditId!=='string'||! /^[A-Za-z0-9_-]{8,128}$/.test(auditId))throw new TypeError('invalid_owner_decision');
 const update=db.prepare("UPDATE team_tasks SET owner_approved=?,state=CASE WHEN ?='rejected' THEN 'blocked' ELSE state END,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='queued' AND owner_approved=0 RETURNING id").bind(decision==='approved'?1:0,decision,taskId);
 const receipt=db.prepare("INSERT INTO team_approval_audit(id,task_id,actor,decision,reason) SELECT ?,id,'owner',?,? FROM team_tasks WHERE id=? AND ((?='approved' AND owner_approved=1 AND state='queued') OR (?='rejected' AND state='blocked' AND owner_approved=0)) RETURNING id").bind(auditId,decision,reason.trim(),taskId,decision,decision);
 // SQL receipt is conditional; caller must inspect both returned rows.
 const results=await db.batch([update,receipt]);
 const changed=results?.[0]?.results||[],logged=results?.[1]?.results||[];
 if(changed.length!==1||logged.length!==1)throw new Error('decision_not_recorded');
 return {taskId,decision,auditId,recorded:true};
}
