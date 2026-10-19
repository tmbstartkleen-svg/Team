import {authorizedExecutor} from './executor-service-auth.mjs';
// Diagnostic only: no task reservations, receipts, changes, or token disclosure.
const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function githubReadConnectivityPreflight(request,env,{fetcher=fetch}={}){
 if(!await authorizedExecutor(request,env))return respond({ok:false,category:'unauthorized'},401);
 if(request.method!=='GET')return respond({ok:false,category:'method_not_allowed'},405);
 if(env.TEAM_TOOL_EXECUTOR_ENABLED==='true'||env.TEAM_TOOL_EXECUTOR_RELEASED==='true')return respond({ok:false,category:'general_release_must_be_off'},503);
 const token=env.TEAM_GITHUB_READ_TOKEN;
 if(typeof token!=='string'||token.length<8)return respond({ok:false,category:'reader_token_missing'},503);
 try{
  const response=await fetcher('https://api.github.com/repos/tmbstartkleen-svg/Team',{
   method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),
   headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}
  });
  if(response.status>=300&&response.status<400)return respond({ok:false,category:'github_http_redirect',upstreamStatus:response.status},200);
  if(!response.ok){
   const category=response.status===401?'github_unauthorized':response.status===403?'github_forbidden_or_limited':response.status===404?'github_not_found':response.status===429?'github_rate_limited':'github_http_error';
   return respond({ok:false,category,upstreamStatus:response.status},200);
  }
  if(Number(response.headers.get('content-length')||0)>32768)return respond({ok:false,category:'github_response_too_large'},200);
  const raw=await response.text();
  if(raw.length>32768)return respond({ok:false,category:'github_response_too_large'},200);
  let data;try{data=JSON.parse(raw)}catch{return respond({ok:false,category:'github_invalid_json'},200)}
  if(data.full_name!=='tmbstartkleen-svg/Team'||!Number.isSafeInteger(data.id)||data.id<=0)return respond({ok:false,category:'github_identity_mismatch'},200);
  return respond({ok:true,category:'verified_repository_read',readOnly:true,ledgerMutated:false});
 }catch(e){
  // Only allowlisted categories; never send raw upstream errors, headers or credentials.
  const name=String(e?.name||'');
  const details=[e?.message,e?.cause?.message,e?.cause?.code,e?.code].filter(x=>typeof x==='string').join(' ').toLowerCase();
  let category='github_network_failure';
  if(name==='TimeoutError'||name==='AbortError'||/timed? ?out|etimedout/.test(details))category='github_timeout';
  else if(/redirect|location/.test(details))category='github_redirect_rejected';
  else if(/certificate|tls|ssl|x509|cert_/.test(details))category='github_tls_failure';
  else if(/dns|enotfound|eai_again|resolve/.test(details))category='github_dns_failure';
  else if(/connection refused|econnrefused/.test(details))category='github_connection_refused';
  else if(/network|connect|fetch failed|connection reset|econnreset/.test(details))category='github_transport_failure';
  return respond({ok:false,category},200);
 }
}
