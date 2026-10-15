import {classifyTaskBlocker} from './orchestration.mjs';
import {createProjectMessage} from './collaboration.mjs';
// Build drafts only. The authenticated dispatch layer must separately authorize delivery.
export function prepareBlockerEscalation({project,taskId,persona,reason,sensitive=false,ownerDecision=false}={}){
 const decision=classifyTaskBlocker(reason,{sensitive,ownerDecision});
 const kind=decision.destination==='owner-direct-message'?'owner':'blocked';
 const draft=createProjectMessage({project,taskId,persona,kind,message:reason});
 return {draft,channel:decision.destination,deliveryConfirmed:false,requiresAuthenticatedDispatch:true,taskComplete:false};
}
export async function loadBlockedTasksForReview(db,{projectId,limit=25}={}){
 if(!db?.prepare||typeof projectId!=='string'||!projectId.trim())throw new TypeError('invalid_project');
 const n=Math.min(50,Math.max(1,Number.isInteger(limit)?limit:25));
 const response=await db.prepare("SELECT id,project_id,title,assigned_persona,blocker_reason,blocker_updated_at FROM team_tasks WHERE project_id=? AND state='blocked' ORDER BY blocker_updated_at DESC LIMIT ?").bind(projectId,n).all();
 return response.results||[];
}
