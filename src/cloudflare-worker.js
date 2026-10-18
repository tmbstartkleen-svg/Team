import {handleOwnerWorkspace} from '../lib/owner-workspace-api.mjs';
import {handleOwnerProjects} from '../lib/owner-projects-api.mjs';
import {handleOwnerApprovalHistory} from '../lib/owner-approval-history-api.mjs';
import {handleOwnerApproval} from '../lib/owner-approval-api.mjs';
import {handleExecutorRun} from '../lib/executor-run-api.mjs';
import {handleAuthorizedToolRun} from '../lib/authorized-tool-run-api.mjs';
import {createGitHubReadAdapter} from '../lib/github-read-adapter.mjs';
import {handleExecutorCertificationPreflight} from '../lib/executor-certification-preflight-api.mjs';
import {handleCertificationLeaseRecovery} from '../lib/certification-lease-recovery-api.mjs';
import {handleMigrationInventory} from '../lib/migration-inventory-api.mjs';
import {handleTaskCertification} from '../lib/task-certification-api.mjs';
import {handleOwnerTaskPreflight} from '../lib/owner-task-claim-api.mjs';
import {handleOwnerCertificationFixture} from '../lib/owner-certification-fixture-api.mjs';
import {ownerCollaborationReadiness} from '../lib/owner-collaboration-readiness.mjs';
import {handleOwnerCollaboration} from '../lib/owner-collaboration-api.mjs';
import {inspectTeamDatabase} from '../lib/d1-readiness.mjs';
import {assessPersonaExecution} from '../lib/persona-execution-readiness.mjs';
import {assessLaunchReadiness} from '../lib/launch-readiness.mjs';
import {buildPlan} from '../lib/orchestration.mjs';
const BACKEND_PATH=/^\/api\/[a-z0-9-]+\/?$/i;
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname==='/__team/health')return new Response(JSON.stringify({ok:true,service:'atlas-team-edge',hosting:'cloudflare',backend:'vercel-standby',backendVerified:false}),{status:200,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(url.pathname==='/api/health'&&request.method==='GET')return new Response(JSON.stringify({ok:true,service:'atlas-team',hosting:'cloudflare',mode:'edge-ui-with-standby-api',productionOperational:false,modelConfigured:false,executionConfigured:false,databaseSchemaVerified:false,backendVerified:false,microsoft365Connected:false,monitoringActive:false}),{status:200,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(url.pathname==='/api/launch-readiness'&&request.method==='GET'){const data=await assessLaunchReadiness(env);return new Response(JSON.stringify(data),{headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})}
  if(url.pathname==='/api/persona-execution-readiness'&&request.method==='GET')return new Response(JSON.stringify({ok:true,...assessPersonaExecution(env)}),{headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(url.pathname==='/api/database-readiness'&&request.method==='GET'){const data=await inspectTeamDatabase(env.TEAM_DB);return new Response(JSON.stringify({ok:true,hosting:'cloudflare',database:data,agentsActive:false}),{headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})}
  if(url.pathname==='/api/owner-collaboration-readiness'&&request.method==='GET')return new Response(JSON.stringify({ok:true,...ownerCollaborationReadiness(env)}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
  if(url.pathname==='/api/owner-workspace')return handleOwnerWorkspace(request,env);
  if(url.pathname==='/api/owner-projects')return handleOwnerProjects(request,env);
  if(url.pathname==='/api/owner-approval-history')return handleOwnerApprovalHistory(request,env);
  if(url.pathname==='/api/owner-approval')return handleOwnerApproval(request,env);
  if(url.pathname==='/api/internal-executor-run')return handleExecutorRun(request,env);
  if(url.pathname==='/api/internal-tool-read'){
   // Service-authenticated endpoint; production flags default closed.
   // No write adapter is registered. Credentials are never returned to callers.
   let adapters={};
   const allow=String(env.TEAM_GITHUB_READ_REPOSITORIES||'').split(',').map(x=>x.trim()).filter(Boolean);
   if(typeof env.TEAM_GITHUB_READ_TOKEN==='string'&&allow.length&&env.TEAM_TOOL_EXECUTOR_ENABLED==='true'&&env.TEAM_TOOL_EXECUTOR_RELEASED==='true'){
    try{adapters={'github.read':createGitHubReadAdapter({fetcher:fetch,token:env.TEAM_GITHUB_READ_TOKEN,allowedRepositories:allow})}}catch{}
   }
   return handleAuthorizedToolRun(request,env,{adapters});
  }
  if(url.pathname==='/api/internal-executor-certification-preflight')return handleExecutorCertificationPreflight(request,env);
  if(url.pathname==='/api/internal-certification-lease-recovery')return handleCertificationLeaseRecovery(request,env);
  if(url.pathname==='/api/migration-inventory')return handleMigrationInventory(request,env);
  if(url.pathname==='/api/task-certification')return handleTaskCertification(request,env);
  if(url.pathname==='/api/owner-task-preflight')return handleOwnerTaskPreflight(request,env);
  if(url.pathname==='/api/owner-certification-fixture')return handleOwnerCertificationFixture(request,env);
  if(url.pathname==='/api/owner-collaboration')return handleOwnerCollaboration(request,env);
  if(url.pathname==='/api/integrations'){
   if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{'content-type':'application/json','allow':'GET','cache-control':'no-store'}});
   return new Response(JSON.stringify({ok:true,hosting:'cloudflare',source:'native-edge',microsoft365:{connected:false,monitoringActive:false,services:['Outlook Mail','Microsoft Teams','Outlook Calendar','Microsoft To Do','OneDrive','SharePoint'],nextStep:'owner-consented-oauth-connection'},gmail:{connected:false,priority:'low',purpose:'optional-side-projects',monitoringActive:false,access:'read-only-consent-required',sendPermission:false},backend:{type:'vercel-standby',verified:false},note:'Connection states are not live account checks'}),{headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  if(url.pathname==='/api/workforce'){
   if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{'content-type':'application/json','allow':'GET','cache-control':'no-store'}});
   return new Response(JSON.stringify({ok:true,source:'cloudflare-edge',authority:'human-project-owner',execution:'approval-required',replication:'owner-proposal-only',personas:[{id:'chief-of-staff',role:'Chief of Staff',scope:'coordinate and prioritize'},{id:'microsoft-triage',role:'Microsoft 365 Triage',scope:'propose important messages and assignments'},{id:'security-review',role:'Security Reviewer',scope:'flag authorization and deployment risks'},{id:'release-review',role:'Release Reviewer',scope:'verify CI and production deployments'}],agentsRunning:false,requiresConfiguredModelAndStorage:true}),{headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  if(url.pathname==='/api/plan'){
   if(request.method!=='POST')return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{'content-type':'application/json','allow':'POST','cache-control':'no-store'}});
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)return new Response(JSON.stringify({ok:false,error:'cross_origin_write_denied'}),{status:403,headers:{'content-type':'application/json','cache-control':'no-store'}});
   if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return new Response(JSON.stringify({ok:false,error:'json_required'}),{status:415,headers:{'content-type':'application/json','cache-control':'no-store'}});
   if(Number(request.headers.get('content-length')||0)>4096)return new Response(JSON.stringify({ok:false,error:'request_too_large'}),{status:413,headers:{'content-type':'application/json','cache-control':'no-store'}});
   let raw;try{raw=await request.text()}catch{return new Response(JSON.stringify({ok:false,error:'invalid_request'}),{status:400,headers:{'content-type':'application/json','cache-control':'no-store'}})}
   if(raw.length>4096)return new Response(JSON.stringify({ok:false,error:'request_too_large'}),{status:413,headers:{'content-type':'application/json','cache-control':'no-store'}});
   let input;try{input=JSON.parse(raw)}catch{return new Response(JSON.stringify({ok:false,error:'invalid_json'}),{status:400,headers:{'content-type':'application/json','cache-control':'no-store'}})}
   try{const plan=buildPlan(input?.goal,{maxStages:input?.maxStages});return new Response(JSON.stringify({ok:true,source:'cloudflare-edge',plan}),{headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}})}
   catch{return new Response(JSON.stringify({ok:false,error:'invalid_goal'}),{status:400,headers:{'content-type':'application/json','cache-control':'no-store'}})}
  }
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(!BACKEND_PATH.test(url.pathname))return new Response('Not found',{status:404});
  if(!['GET','POST','OPTIONS'].includes(request.method))return new Response('Method not allowed',{status:405});
  // Temporary compatibility bridge: Cloudflare hosts the UI, existing Vercel
  // functions remain the API origin until they are ported to Cloudflare.
  const upstream=new URL(env.TEAM_API_ORIGIN||'https://team-rho-self.vercel.app');
  if(upstream.hostname===url.hostname)return new Response(JSON.stringify({ok:false,error:'backend_loop_rejected'}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
  if(upstream.protocol!=='https:'||upstream.username||upstream.password||upstream.pathname!=='/'||upstream.search) return new Response('Backend not configured',{status:503});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'allow':'GET, POST, OPTIONS','cache-control':'no-store'}});
  if(request.method==='POST'){
   const origin=request.headers.get('origin');
   if(origin&&origin!==url.origin)return new Response(JSON.stringify({ok:false,error:'cross_origin_write_denied'}),{status:403,headers:{'content-type':'application/json','cache-control':'no-store'}});
  }
  const target=new URL(url.pathname+url.search,upstream);
  const headers=new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  headers.delete('cf-connecting-ip');
  headers.delete('x-forwarded-for');
  headers.delete('x-real-ip');
  headers.delete('x-forwarded-host');
  headers.delete('x-forwarded-proto');
  let response;
  try{response=await fetch(new Request(target,{method:request.method,headers,body:request.method==='GET'||request.method==='HEAD'?undefined:request.body,redirect:'manual'}));}
  catch{return new Response(JSON.stringify({ok:false,error:'team_backend_unavailable'}),{status:502,headers:{'content-type':'application/json','cache-control':'no-store'}})}
  const safe=new Headers(response.headers);
  safe.delete('set-cookie');
  safe.delete('location');
  safe.delete('access-control-allow-origin');
  safe.set('Cache-Control','no-store');
  safe.set('X-Team-Backend','vercel-standby');
  return new Response(response.body,{status:response.status,headers:safe});
 }
};
