import {authorized} from './owner-collaboration-api.mjs';
import {inspectExecutorSchema} from './executor-schema-readiness.mjs';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Read-only evidence of a single task. Does not infer that an AI provider actually ran.
export async function handleTaskCertification(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 const id=new URL(request.url).searchParams.get('taskId');
 if(!id||!/^[A-Za-z0-9_-]{1,128}$/.test(id))return json({ok:false,error:'invalid_task_id'},400);
 if(!(await inspectExecutorSchema(env.TEAM_DB)).ready)return json({ok:false,error:'executor_schema_incomplete'},503);
 try{
  const db=env.TEAM_DB;
  const task=await db.prepare('SELECT id,state,owner_approved,attempt_count,completion_evidence FROM team_tasks WHERE id=?').bind(id).first();
  if(!task)return json({ok:false,error:'task_not_found'},404);
  const approval=await db.prepare("SELECT id,decision,created_at FROM team_approval_audit WHERE task_id=? ORDER BY created_at DESC,id DESC LIMIT 1").bind(id).first();
  const receipts=await db.prepare("SELECT id,outcome,attempt_count,created_at FROM team_execution_receipts WHERE task_id=? ORDER BY created_at DESC,id DESC LIMIT 10").bind(id).all();
  const records=receipts.results||[];
  const verified=task.state==='verified'&&task.owner_approved===1&&approval?.decision==='approved'&&records.some(x=>x.outcome==='verified'&&x.attempt_count===task.attempt_count)&&typeof task.completion_evidence==='string'&&task.completion_evidence.trim().length>=8;
  return json({ok:true,taskId:id,taskState:task.state,approvalRecorded:approval?.decision==='approved',receiptCount:records.length,receiptIds:records.map(x=>x.id),evidenceRecorded:verified,liveProviderCertified:false,releaseCertified:false});
 }catch{return json({ok:false,error:'certification_query_failed'},503)}
}
