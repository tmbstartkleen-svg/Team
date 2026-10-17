import {authorizedExecutor} from './executor-service-auth.mjs';
import {inspectExecutorSchema} from './executor-schema-readiness.mjs';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Read-only service-gated preflight. Does not claim a lease, run AI, or write D1.
export async function handleExecutorCertificationPreflight(request,env){
 if(!await authorizedExecutor(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 const taskId=new URL(request.url).searchParams.get('taskId');
 if(!/^cert-[A-Za-z0-9_-]{8,120}$/.test(taskId||''))return json({ok:false,error:'invalid_certification_task_id'},400);
 const checks={
  enabled:env.TEAM_EXECUTOR_ENABLED==='true',
  certificationMode:env.TEAM_EXECUTOR_CERTIFICATION_MODE==='true',
  generalReleaseOff:env.TEAM_EXECUTOR_GENERAL_RELEASED!=='true',
  exactTaskPinned:env.TEAM_EXECUTOR_CERTIFICATION_TASK_ID===taskId,
  cloudflareProvider:env.TEAM_INFERENCE_PROVIDER==='cloudflare'&&typeof env.AI?.run==='function',
  databaseBound:Boolean(env.TEAM_DB?.prepare&&env.TEAM_DB?.batch)
 };
 if(!Object.values(checks).every(Boolean))return json({ok:false,ready:false,checks,error:'certification_environment_not_ready'},503);
 const schema=await inspectExecutorSchema(env.TEAM_DB);
 if(!schema.ready)return json({ok:false,ready:false,checks:{...checks,schema:false},error:'executor_schema_incomplete'},503);
 try{
  const task=await env.TEAM_DB.prepare("SELECT id,state,owner_approved,attempt_count,assigned_persona FROM team_tasks WHERE id=?").bind(taskId).first();
  const approved=await env.TEAM_DB.prepare("SELECT decision FROM team_approval_audit WHERE task_id=? ORDER BY created_at DESC,id DESC LIMIT 1").bind(taskId).first();
  const receipts=await env.TEAM_DB.prepare("SELECT COUNT(*) AS count FROM team_execution_receipts WHERE task_id=?").bind(taskId).first();
  const clean=task?.state==='queued'&&task?.owner_approved===1&&task?.attempt_count===0&&task?.assigned_persona==='release-review'&&approved?.decision==='approved'&&receipts?.count===0;
  return json({ok:clean,ready:clean,checks:{...checks,schema:true,taskApproved:clean},error:clean?null:'test_task_not_clean'},clean?200:409);
 }catch{return json({ok:false,ready:false,error:'certification_preflight_failed'},503)}
}
