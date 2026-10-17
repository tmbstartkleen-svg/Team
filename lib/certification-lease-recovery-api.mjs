import {authorizedExecutor} from './executor-service-auth.mjs';
import {expireTaskLease} from './d1-task-queue.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Owner-authorized service can quarantine ONLY its exact pinned expired certification task.
// No automatic retries, no general recovery, and no way to modify an unexpired lease.
export async function handleCertificationLeaseRecovery(request,env){
 if(!await authorizedExecutor(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 if(env.TEAM_EXECUTOR_CERTIFICATION_MODE!=='true'||env.TEAM_EXECUTOR_GENERAL_RELEASED==='true'||env.TEAM_EXECUTOR_ENABLED!=='true')return json({ok:false,error:'certification_mode_required'},503);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json({ok:false,error:'json_required'},415);
 if(Number(request.headers.get('content-length')||0)>512)return json({ok:false,error:'payload_too_large'},413);
 let raw;try{raw=await request.text()}catch{return json({ok:false,error:'invalid_request'},400)}
 if(raw.length>512)return json({ok:false,error:'payload_too_large'},413);
 let input;try{input=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['taskId','confirm'].includes(k))||input.confirm!=='QUARANTINE-EXPIRED-CERT-LEASE'||!/^cert-[A-Za-z0-9_-]{8,120}$/.test(input.taskId||'')||input.taskId!==env.TEAM_EXECUTOR_CERTIFICATION_TASK_ID)return json({ok:false,error:'certification_task_only'},403);
 try{
  const task=await env.TEAM_DB.prepare("SELECT state,owner_approved,lease_token,lease_until,attempt_count FROM team_tasks WHERE id=?").bind(input.taskId).first();
  if(!task||task.state!=='running'||task.owner_approved!==1||typeof task.lease_token!=='string'||task.lease_token.length<16||!task.lease_until||task.attempt_count!==1)return json({ok:false,error:'no_eligible_running_certification_lease'},409);
  // Refuse invalid or unexpired timestamps before attempting a guarded SQL write.
  const expiry=Date.parse(task.lease_until);
  if(!Number.isFinite(expiry)||expiry>Date.now())return json({ok:false,error:'lease_not_expired'},409);
  const recovered=await expireTaskLease(env.TEAM_DB,{id:input.taskId,leaseToken:task.lease_token});
  if(!recovered||recovered.state!=='blocked')return json({ok:false,error:'lease_conflict_or_not_expired'},409);
  return json({ok:true,taskId:input.taskId,state:'blocked',reason:'lease-expired',requiresOwnerReview:true,executionTriggered:false});
 }catch{return json({ok:false,error:'certification_recovery_failed'},503)}
}
