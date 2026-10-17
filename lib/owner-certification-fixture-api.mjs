import {authorized} from './owner-collaboration-api.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Owner-only fixture creation. Never approves, claims, or executes a task.
export async function handleOwnerCertificationFixture(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return json({ok:false,error:'cross_origin_write_denied'},403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))return json({ok:false,error:'json_required'},415);
 if(Number(request.headers.get('content-length')||0)>500)return json({ok:false,error:'payload_too_large'},413);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 let raw;try{raw=await request.text()}catch{return json({ok:false,error:'invalid_request'},400)}
 if(raw.length>500)return json({ok:false,error:'payload_too_large'},413);
 let input;try{input=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>k!=='taskId'&&k!=='confirm')||!/^cert-[A-Za-z0-9_-]{8,120}$/.test(input.taskId||'')||input.confirm!=='CREATE-UNAPPROVED-TEST-TASK')return json({ok:false,error:'invalid_certification_fixture'},400);
 if(env.TEAM_EXECUTOR_ENABLED==='true')return json({ok:false,error:'executor_must_be_disabled'},503);
 if(typeof env.TEAM_EXECUTOR_CERTIFICATION_TASK_ID==='string'&&env.TEAM_EXECUTOR_CERTIFICATION_TASK_ID!==input.taskId)return json({ok:false,error:'task_scope_mismatch'},403);
 const title='Certification-only analysis: summarize why an approved AI task must be limited to analysis and must not perform external actions.';
 try{
  const result=await env.TEAM_DB.prepare("INSERT INTO team_tasks(id,project_id,title,assigned_persona,state,owner_approved) VALUES (?,NULL,?,'release-review','queued',0) ON CONFLICT(id) DO NOTHING RETURNING id,state,owner_approved").bind(input.taskId,title).first();
  if(!result)return json({ok:false,error:'fixture_already_exists'},409);
  return json({ok:true,taskId:result.id,state:'queued',ownerApproved:false,executionStarted:false,approvalRequired:true},201);
 }catch{return json({ok:false,error:'fixture_creation_failed'},503)}
}
