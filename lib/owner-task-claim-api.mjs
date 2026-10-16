import {authorized} from './owner-collaboration-api.mjs';
import {claimApprovedTask} from './d1-task-queue.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Owner-only manual claim primitive. A claim does not run AI or certify execution.
export async function handleOwnerTaskClaim(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return json({ok:false,error:'cross_origin_write_denied'},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json({ok:false,error:'json_required'},415);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 if(Number(request.headers.get('content-length')||0)>1024)return json({ok:false,error:'payload_too_large'},413);
 let raw;try{raw=await request.text()}catch{return json({ok:false,error:'invalid_request'},400)}
 if(raw.length>1024)return json({ok:false,error:'payload_too_large'},413);
 let data;try{data=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
 if(typeof data?.taskId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(data.taskId))return json({ok:false,error:'invalid_task_id'},400);
 const leaseToken=crypto.randomUUID()+crypto.randomUUID();
 const leaseUntil=new Date(Date.now()+5*60*1000).toISOString();
 try{
  const claimed=await claimApprovedTask(env.TEAM_DB,{id:data.taskId,leaseToken,leaseUntil});
  if(!claimed)return json({ok:false,error:'not_approved_or_not_queued'},409);
  // Do not expose a lease credential to a browser. Executor integration must use service identity.
  return json({ok:true,taskId:claimed.id,state:'running',leaseUntil,executionStarted:false,requiresAuthorizedExecutor:true},202);
 }catch{return json({ok:false,error:'task_claim_failed'},503)}
}
