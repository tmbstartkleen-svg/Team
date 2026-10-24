import {authorizedExecutor} from './executor-service-auth.mjs';
import {loadPersistedToolGrant} from './d1-tool-step-grants.mjs';
import {executeDurableToolStep} from './durable-tool-execution.mjs';
import {createGitHubReadAdapter} from './github-read-adapter.mjs';
import {certificationLedgerAdapter} from './certification-ledger-adapter.mjs';

const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const PROTECTED=new Set(['cert-github-read-20261018','cert-github-read-20261019-v2']);
export async function handleStagingGitHubCertification(request,env,{fetcher=fetch,execute=executeDurableToolStep}={}){
 if(!await authorizedExecutor(request,env))return reply({ok:false,error:'unauthorized'},401);
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 // Explicitly opt-in, staging-only route. Both switches default off.
 if(env.ATLAS_RUNTIME_ENV!=='staging'||env.TEAM_STAGING_GITHUB_CERTIFICATION_ENABLED!=='true')
  return reply({ok:false,error:'staging_certification_disabled'},503);
 if(env.TEAM_TOOL_EXECUTOR_ENABLED==='true'||env.TEAM_TOOL_EXECUTOR_RELEASED==='true')
  return reply({ok:false,error:'general_executor_must_remain_off'},503);
 if(!String(request.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))
  return reply({ok:false,error:'json_required'},415);
 let body;try{const raw=await request.text();if(raw.length>256)return reply({ok:false,error:'payload_too_large'},413);body=JSON.parse(raw)}catch{return reply({ok:false,error:'invalid_json'},400)}
 if(!body||Object.keys(body).length!==2||typeof body.taskId!=='string'||typeof body.stepId!=='string'||!ID.test(body.taskId)||!ID.test(body.stepId))
  return reply({ok:false,error:'invalid_scope'},400);
 const taskId=env.TEAM_STAGING_GITHUB_CERTIFICATION_TASK_ID;
 if(!taskId||!ID.test(taskId)||PROTECTED.has(taskId)||body.taskId!==taskId)
  return reply({ok:false,error:'new_staging_task_required'},403);
 if(!env.TEAM_DB?.prepare)return reply({ok:false,error:'database_missing'},503);
 const stepId=body.stepId;
 try{
  const grant=await loadPersistedToolGrant(env.TEAM_DB,{taskId,stepId});
  const target=grant?.step?.target;
  if(!grant||grant.step.tool!=='github.read'||grant.step.capability!=='read'||
    grant.step.persona!=='release-review'||target?.owner!=='tmbstartkleen-svg'||
    target?.repo!=='Team'||target?.resource!=='repository'||Object.keys(target).length!==3)
    return reply({ok:false,error:'invalid_grant'},403);
  if(typeof env.TEAM_GITHUB_READ_TOKEN!=='string'||!env.TEAM_GITHUB_READ_TOKEN)
    return reply({ok:false,error:'github_read_credential_missing'},503);
  const ledgerNs=env.TEAM_CERT_LEDGER;
  if(!ledgerNs?.idFromName||!ledgerNs?.get)return reply({ok:false,error:'certification_ledger_missing'},503);
  const adapter=createGitHubReadAdapter({fetcher,token:env.TEAM_GITHUB_READ_TOKEN,allowedRepositories:['tmbstartkleen-svg/Team']});
  const ledger=certificationLedgerAdapter(ledgerNs.get(ledgerNs.idFromName(taskId)));
  const result=await execute({db:env.TEAM_DB,taskId,stepId,step:grant.step,approval:grant.approval,adapters:{'github.read':adapter},ledger});
  if(result?.ok!==true)return reply({ok:false,status:result?.status||'blocked',reason:['not_safe_to_replay','outcome_persistence_failed','adapter_error','timeout','missing_verified_receipt'].includes(result?.reason)?result.reason:'certification_not_verified',executed:result?.executed===true},409);
  return reply({ok:true,classification:'STAGING_GITHUB_READ_VERIFIED',taskId,stepId,status:result.status,receiptId:result.receiptId,evidence:result.evidence,durable:result.durable===true,productionTouched:false,modelExecution:'not called'});
 }catch{return reply({ok:false,error:'staging_certification_failed'},502)}
}
