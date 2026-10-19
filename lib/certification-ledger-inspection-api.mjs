import {authorizedExecutor} from './executor-service-auth.mjs';
import {loadPersistedToolGrant} from './d1-tool-step-grants.mjs';
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const taskId='cert-github-read-20261018',stepId='cert-github-repository-read';
export async function inspectCertificationLedger(request,env){
 if(!await authorizedExecutor(request,env))return respond({ok:false,error:'unauthorized'},401);
 if(request.method!=='GET')return respond({ok:false,error:'method_not_allowed'},405);
 if(!env.TEAM_DB?.prepare||!env.TEAM_CERT_LEDGER?.get)return respond({ok:false,error:'ledger_unavailable'},503);
 try{
  const grant=await loadPersistedToolGrant(env.TEAM_DB,{taskId,stepId});
  if(!grant||grant.step.tool!=='github.read'||grant.step.persona!=='release-review')return respond({ok:false,error:'invalid_grant'},403);
  const stub=env.TEAM_CERT_LEDGER.get(env.TEAM_CERT_LEDGER.idFromName(taskId));
  const result=await stub.inspect({idempotencyKey:grant.step.idempotencyKey});
  return respond({ok:true,taskId,stepId,...result,executed:false,readOnly:true});
 }catch{return respond({ok:false,error:'inspection_unavailable'},503)}
}
