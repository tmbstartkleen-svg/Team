import {authorizedExecutor} from './executor-service-auth.mjs';
import {loadPersistedToolGrant} from './d1-tool-step-grants.mjs';
import {executeDurableToolStep} from './durable-tool-execution.mjs';
import {createGitHubReadAdapter} from './github-read-adapter.mjs';
const reply=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const classifyD1Failure=e=>{
 const messages=[];
 let current=e;
 for(let depth=0;depth<4&&current;depth++){
  if(typeof current.message==='string')messages.push(current.message);
  current=current.cause;
 }
 const message=messages.join(' ').toLowerCase();
 if(message.includes('no such function'))return 'sqlite_missing_function';
 if(message.includes('no such column'))return 'sqlite_missing_column';
 if(message.includes('syntax error')||message.includes('near \\"')&&message.includes('syntax'))return 'sqlite_syntax';
 if(message.includes('not authorized')||message.includes('authorization denied'))return 'sqlite_auth';
 if(message.includes('transaction')&&message.includes('not supported'))return 'sqlite_transaction_unsupported';
 if(message.includes('write')&&message.includes('limit'))return 'database_write_limit';
 if(message.includes('exceeded')&&message.includes('limit'))return 'database_limit';
 if(message.includes('binding')&&message.includes('invalid'))return 'database_invalid_binding';
 if(message.includes('sqlite_auth'))return 'sqlite_auth';
 if(message.includes('sqlite_readonly'))return 'sqlite_readonly';
 if(message.includes('sqlite_constraint'))return 'sqlite_constraint';
 if(message.includes('sqlite_busy'))return 'sqlite_busy';
 if(message.includes('sqlite_full'))return 'sqlite_full';
 if(message.includes('sqlite_schema'))return 'sqlite_schema';
 if(message.includes('sqlite_error'))return 'sqlite_error';
 if(message.includes('readonly')||message.includes('read-only'))return 'database_read_only';
 if(message.includes('no such table'))return 'database_table_missing';
 if(message.includes('constraint failed')||message.includes('constraint violation'))return 'database_constraint';
 if(message.includes('database is locked')||message.includes('sqlite_busy'))return 'database_busy';
 if(message.includes('too many requests')||message.includes('rate limit')||message.includes('429'))return 'database_throttled';
 if(message.includes('quota')||message.includes('limit exceeded')||message.includes('daily limit'))return 'database_quota';
 if(message.includes('not authorized')||message.includes('permission denied')||message.includes('cannot write'))return 'database_write_denied';
 if(message.includes('d1_error')||message.includes('sqlite_error'))return 'database_driver_error';
 if(message.includes('internal error')||message.includes('service unavailable')||message.includes('503'))return 'database_service_error';
 return 'unclassified';
};
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
 const result=await execute({db:env.TEAM_DB,taskId,stepId,step:grant.step,approval:grant.approval,adapters:{'github.read':adapter},onStage:phase=>{stage=phase}});
 return reply(result,result.ok?200:409);
 }catch(error){return reply({ok:false,error:'certification_failed',stage,category:stage==='reservation_run'?classifyD1Failure(error):'unclassified'},502)}
}
