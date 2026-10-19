import {authorizedExecutor} from './executor-service-auth.mjs';
import {loadPersistedToolGrant} from './d1-tool-step-grants.mjs';
import {executeDurableToolStep} from './durable-tool-execution.mjs';
import {createGitHubReadAdapter} from './github-read-adapter.mjs';
const reply=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const taskId='cert-github-read-20261018', stepId='cert-github-repository-read';
export async function handleOneShotGitHubCertification(request,env,{fetcher=fetch,execute=executeDurableToolStep}={}){
 if(!await authorizedExecutor(request,env))return reply({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(env.TEAM_TOOL_EXECUTOR_ENABLED==='true'||env.TEAM_TOOL_EXECUTOR_RELEASED==='true')return reply({ok:false,error:'general_release_must_be_off'},503);
 if(env.TEAM_GITHUB_CERTIFICATION_TASK_ID!==taskId)return reply({ok:false,error:'certification_disabled'},503);
 let body;try{const raw=await request.text();if(raw.length>256)return reply({ok:false,error:'payload_too_large'},413);body=JSON.parse(raw)}catch{return reply({ok:false,error:'invalid_json'},400)}
 if(body?.taskId!==taskId||body?.stepId!==stepId||Object.keys(body).length!==2)return reply({ok:false,error:'invalid_scope'},403);
 if(!env.TEAM_DB?.prepare)return reply({ok:false,error:'database_missing'},503);
 let stage='grant_lookup';
 try{
 const grant=await loadPersistedToolGrant(env.TEAM_DB,{taskId,stepId});
 const target=grant?.step?.target;
 if(!grant||grant.step.tool!=='github.read'||grant.step.capability!=='read'||grant.step.persona!=='release-review'||target?.owner!=='tmbstartkleen-svg'||target?.repo!=='Team'||target?.resource!=='repository'||Object.keys(target).length!==3)return reply({ok:false,error:'invalid_grant'},403);
 stage='adapter_setup';
 const adapter=createGitHubReadAdapter({fetcher,token:env.TEAM_GITHUB_READ_TOKEN,allowedRepositories:['tmbstartkleen-svg/Team']});
 stage='durable_execution';
 const result=await execute({db:env.TEAM_DB,taskId,stepId,step:grant.step,approval:grant.approval,adapters:{'github.read':adapter}});
 return reply(result,result.ok?200:409);
 }catch{return reply({ok:false,error:'certification_failed',stage},502)}
}
