import {authorized} from './owner-collaboration-api.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handleOwnerApprovalHistory(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 const url=new URL(request.url),taskId=url.searchParams.get('taskId');
 if(!taskId||!/^[a-zA-Z0-9_-]{1,128}$/.test(taskId))return json({ok:false,error:'invalid_task_id'},400);
 try{
  const r=await env.TEAM_DB.prepare("SELECT id,task_id,actor,decision,reason,created_at FROM team_approval_audit WHERE task_id=? ORDER BY created_at DESC,id DESC LIMIT 50").bind(taskId).all();
  return json({ok:true,taskId,decisions:r.results||[],source:'cloudflare-d1'});
 }catch{return json({ok:false,error:'approval_audit_unavailable'},503)}
}
