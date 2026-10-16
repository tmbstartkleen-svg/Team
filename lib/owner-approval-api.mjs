import {authorized} from './owner-collaboration-api.mjs';
import {recordOwnerDecision} from './d1-approval-audit.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handleOwnerApproval(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return json({ok:false,error:'cross_origin_write_denied'},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json({ok:false,error:'json_required'},415);
 if(!env.TEAM_DB?.prepare||!env.TEAM_DB?.batch)return json({ok:false,error:'database_not_connected'},503);
 if(Number(request.headers.get('content-length')||0)>2048)return json({ok:false,error:'payload_too_large'},413);
 let raw;try{raw=await request.text()}catch{return json({ok:false,error:'invalid_request'},400)}
 if(raw.length>2048)return json({ok:false,error:'payload_too_large'},413);
 let body;try{body=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.taskId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(body.taskId)||!['approved','rejected'].includes(body.decision)||typeof body.reason!=='string'||body.reason.trim().length<8||body.reason.length>500)return json({ok:false,error:'invalid_decision'},400);
 try{
  const receipt=await recordOwnerDecision(env.TEAM_DB,{taskId:body.taskId,decision:body.decision,reason:body.reason,auditId:crypto.randomUUID()});
  return json({ok:true,...receipt},201);
 }catch(error){
  if(error?.message==='decision_not_recorded')return json({ok:false,error:'decision_conflict_or_audit_failed'},409);
  return json({ok:false,error:'approval_persistence_failed'},503);
 }
}
