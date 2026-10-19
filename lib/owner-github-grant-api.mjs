import {authorized} from './owner-collaboration-api.mjs';
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function handleOwnerGitHubGrant(request,env){
 if(!await authorized(request,env))return reply({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return reply({ok:false,error:'invalid_origin'},403);
 if(env.TEAM_TOOL_EXECUTOR_ENABLED==='true'||env.TEAM_TOOL_EXECUTOR_RELEASED==='true')return reply({ok:false,error:'executor_not_disabled'},503);
 if(!env.TEAM_DB?.prepare)return reply({ok:false,error:'database_missing'},503);
 let body;try{const raw=await request.text();if(raw.length>300)return reply({ok:false,error:'too_large'},413);body=JSON.parse(raw)}catch{return reply({ok:false,error:'invalid_json'},400)}
 if(body?.taskId!=='cert-github-read-20261018'||body?.confirm!=='GRANT-READ-ONLY-TEAM-REPO'||Object.keys(body).length!==2)return reply({ok:false,error:'invalid_scope'},400);
 try{
  const task=await env.TEAM_DB.prepare("SELECT owner_approved,state,assigned_persona FROM team_tasks WHERE id=?").bind(body.taskId).first();
  const audit=await env.TEAM_DB.prepare("SELECT decision FROM team_approval_audit WHERE task_id=? ORDER BY created_at DESC,id DESC LIMIT 1").bind(body.taskId).first();
  if(task?.owner_approved!==1||task?.state!=='queued'||task?.assigned_persona!=='release-review'||audit?.decision!=='approved')return reply({ok:false,error:'approval_required'},403);
  const result=await env.TEAM_DB.prepare("INSERT INTO team_tool_step_grants(task_id,step_id,persona,tool,capability,target_json,idempotency_key,confirmation,enabled) VALUES(?,?,?,?,?,?,?,?,1) ON CONFLICT(task_id,step_id) DO NOTHING").bind(body.taskId,'cert-github-repository-read','release-review','github.read','read',JSON.stringify({owner:'tmbstartkleen-svg',repo:'Team',resource:'repository'}),'cert-github-read-20261018-once',0).run();
  if(result?.meta?.changes!==1)return reply({ok:false,error:'grant_already_exists'},409);
  return reply({ok:true,taskId:body.taskId,capability:'read',repository:'tmbstartkleen-svg/Team',executionStarted:false},201);
 }catch{return reply({ok:false,error:'grant_failed'},503)}
}
