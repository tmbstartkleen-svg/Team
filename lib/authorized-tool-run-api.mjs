import {authorizedExecutor} from './executor-service-auth.mjs';
import {executeDurableToolStep} from './durable-tool-execution.mjs';
// Dedicated service-only endpoint. Caller grants are server-configured, never taken from input.
const json=(data,status)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
export async function handleAuthorizedToolRun(request,env,{adapters={},loadGrant,execute=executeDurableToolStep}={}){
 if(!await authorizedExecutor(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 if(env.TEAM_TOOL_EXECUTOR_ENABLED!=='true'||env.TEAM_TOOL_EXECUTOR_RELEASED!=='true')
  return json({ok:false,error:'release_gate_closed'},503);
 if(!env.TEAM_DB?.prepare||typeof loadGrant!=='function')
  return json({ok:false,error:'executor_unconfigured'},503);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))
  return json({ok:false,error:'json_required'},415);
 if(Number(request.headers.get('content-length')||0)>2048)return json({ok:false,error:'payload_too_large'},413);
 let raw;try{raw=await request.text()}catch{return json({ok:false,error:'invalid_request'},400)}
 if(raw.length>2048)return json({ok:false,error:'payload_too_large'},413);
 let input;try{input=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
 if(!input||!ID.test(input.taskId)||!ID.test(input.stepId))
  return json({ok:false,error:'invalid_step'},400);
 try{
  const grant=await loadGrant(env.TEAM_DB,{taskId:input.taskId,stepId:input.stepId});
  if(!grant||grant.ownerApproved!==true||!grant.step||!grant.approval)
   return json({ok:false,error:'step_not_approved'},403);
  // All tool names, approval grants, capabilities and idempotency IDs come from
  // trusted persistent server state. User input is only a task/step lookup.
  const result=await execute({db:env.TEAM_DB,taskId:input.taskId,stepId:input.stepId,
   step:grant.step,approval:grant.approval,adapters});
  return json(result,result.ok?200:result.status==='denied'?403:409);
 }catch{return json({ok:false,error:'tool_execution_failed'},502)}
}
