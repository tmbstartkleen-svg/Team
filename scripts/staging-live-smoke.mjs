#!/usr/bin/env node
// Safe live ATLAS Preview smoke test. Creates one synthetic task and rejects it;
// never calls model execution and refuses non-preview deployments.
import {evaluateStagingRelease} from '../lib/staging-release-evidence.mjs';
import {evaluateReadOnlyPreflight} from '../lib/staging-readonly-evidence.mjs';
import {vercelRequest} from '../lib/vercel-staging-transport.mjs';
const base=(process.env.ATLAS_PREVIEW_URL||'').replace(/\/$/,'');
const token=process.env.TEAM_ADMIN_TOKEN||'';
const protectionBypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET||'';
const cliMode=process.env.ATLAS_STAGING_TRANSPORT==='vercel';
if(!base||!token){console.error('Set ATLAS_PREVIEW_URL and TEAM_ADMIN_TOKEN.');process.exit(2)}
let origin;
try{origin=new URL(base)}catch{console.error('Invalid ATLAS_PREVIEW_URL');process.exit(2)}
if(origin.protocol!=='https:'||!origin.hostname.endsWith('.vercel.app')){console.error('Refusing non-Vercel HTTPS target');process.exit(2)}
async function request(path,options={}){
 if(cliMode) return vercelRequest({base,path,method:options.method||'GET',body:options.body,token});
 const response=await fetch(base+path,{...options,headers:{authorization:'Bearer '+token,'content-type':'application/json',...(protectionBypass?{'x-vercel-protection-bypass':protectionBypass}:{}),...(options.headers||{})},signal:AbortSignal.timeout(8000)});
 let body={};try{body=await response.json()}catch{}
 return {status:response.status,body};
}

const health=await request('/api/health',{method:'GET'});
const expectedCommit=(process.env.ATLAS_EXPECTED_COMMIT||'').trim();
const safety=evaluateReadOnlyPreflight({status:health.status,body:health.body},null,expectedCommit);
if(safety.stage!=='operator-read'){
 console.error('Staging safety preflight failed: refusing all writes.',JSON.stringify(safety));
 process.exit(3);
}
const authProbe=await request('/api/tasks',{method:'GET'});
const auth=evaluateReadOnlyPreflight({status:health.status,body:health.body},{status:authProbe.status,body:authProbe.body},expectedCommit);
if(!auth.ok){
 console.error('Read-only authorization preflight failed: refusing all writes.',JSON.stringify(auth));
 process.exit(3);
}
const title='ATLAS staging smoke '+new Date().toISOString();
const created=await request('/api/tasks',{method:'POST',body:JSON.stringify({title,persona:'Chief Architect',priority:'low'})});
if(created.status!==201||!created.body.task?.id){console.error('Task creation failed:',created.status,created.body.error||'unexpected response');process.exit(4)}
const taskId=created.body.task.id;
const decision=await request('/api/approve',{method:'POST',body:JSON.stringify({taskId,decision:'rejected'})});
if(decision.status!==200){console.error('Synthetic task rejection failed:',decision.status,decision.body.error||'unexpected response');process.exit(5)}
const replay=await request('/api/approve',{method:'POST',body:JSON.stringify({taskId,decision:'rejected'})});
if(replay.status!==409){console.error('Duplicate decision was not blocked:',replay.status);process.exit(6)}
const [tasks,events]=await Promise.all([request('/api/tasks',{method:'GET'}),request('/api/events',{method:'GET'})]);
if(tasks.status!==200||events.status!==200){console.error('Read-back failed:',JSON.stringify({tasks:tasks.status,events:events.status}));process.exit(7)}
const persisted=(tasks.body.tasks||[]).find(x=>x.id===taskId);
const eventTypes=(events.body.events||[]).filter(x=>x.task_id===taskId||x.taskId===taskId).map(x=>x.event_type||x.eventType);
if(!persisted||persisted.approval!=='rejected'||!eventTypes.includes('task.created')||!eventTypes.includes('task.rejected')){
 console.error('Persistence/audit assertion failed:',JSON.stringify({taskFound:Boolean(persisted),approval:persisted?.approval,eventTypes}));process.exit(8)
}
const evidence={ok:true,environment:'preview',releaseCommit:health.body.releaseCommit,taskId,taskStatus:persisted.status,approval:persisted.approval,auditEvents:eventTypes,duplicateDecisionStatus:replay.status,modelExecution:'not called',productionTouched:false};
const certification=evaluateStagingRelease(health.body,evidence);
if(!certification.ok){console.error('Staging evidence verification incomplete:',JSON.stringify(certification));process.exit(9)}
console.log(JSON.stringify({...evidence,certification}));
