import {authorized} from './owner-collaboration-api.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Read-only preflight: never claim a task before an executor can use the lease.
export async function handleOwnerTaskPreflight(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 const taskId=new URL(request.url).searchParams.get('taskId');
 if(!taskId||!/^[A-Za-z0-9_-]{1,128}$/.test(taskId))return json({ok:false,error:'invalid_task_id'},400);
 try{
  const task=await env.TEAM_DB.prepare('SELECT id,state,owner_approved,attempt_count,assigned_persona FROM team_tasks WHERE id=?').bind(taskId).first();
  if(!task)return json({ok:false,error:'task_not_found'},404);
  const approved=task.owner_approved===1;
  const claimable=approved&&task.state==='queued';
  return json({ok:true,taskId:task.id,state:task.state,assignedPersona:task.assigned_persona||null,attemptCount:task.attempt_count,ownerApproved:approved,claimable,executionStarted:false,executorConnected:false,reason:claimable?'awaiting_authorized_executor':'task_not_claimable'});
 }catch{return json({ok:false,error:'task_preflight_failed'},503)}
}
