import fs from 'node:fs/promises';
const base='https://atlas-team.tmbstartkleen.workers.dev';
const id=process.env.TASK_ID||'';
const confirm=process.env.CONFIRM||'';
const owner=process.env.OWNER_TOKEN||'';
const executor=process.env.EXECUTOR_TOKEN||'';
const timeout=20000;
const get=async(path,token)=>call(path,token,'GET');
async function call(path,token,method='GET',data){
 const res=await fetch(base+path,{method,headers:{authorization:'Bearer '+token,...(data?{'content-type':'application/json'}:{})},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(timeout)});
 const body=await res.json().catch(()=>({}));
 return {status:res.status,body};
}
const assert=(test,message)=>{if(!test)throw Error(message)};
const ensureInput=()=>{
 assert(/^cert-[A-Za-z0-9_-]{8,120}$/.test(id),'invalid_certification_task_id');
 assert(confirm==='AUTHORIZE-ONE-SCOPED-AI-EXECUTION','explicit_one_shot_confirmation_missing');
 for(const [name,value] of [['OWNER_TOKEN',owner],['EXECUTOR_TOKEN',executor],['CLOUDFLARE_API_TOKEN',process.env.CLOUDFLARE_API_TOKEN],['CLOUDFLARE_ACCOUNT_ID',process.env.CLOUDFLARE_ACCOUNT_ID]])assert((value||'').length>=32,'missing_or_short_'+name);
 assert(/^[0-9a-fA-F-]{36}$/.test(process.env.TEAM_D1_DATABASE_ID||''),'TEAM_D1_DATABASE_ID_missing_or_invalid');
};
async function preflight(){
 ensureInput();
 const before=await get('/api/owner-task-preflight?taskId='+encodeURIComponent(id),owner);
 assert(before.status===200&&before.body.ok===true&&before.body.taskId===id&&before.body.ownerApproved===true&&before.body.claimable===true&&before.body.state==='queued'&&before.body.attemptCount===0&&before.body.assignedPersona==='release-review','task_not_fresh_approved_certification_fixture');
 const receipt=await get('/api/task-certification?taskId='+encodeURIComponent(id),owner);
 assert(receipt.status===200&&receipt.body.ok===true&&receipt.body.taskId===id&&receipt.body.receiptCount===0&&receipt.body.taskState==='queued'&&receipt.body.approvalRecorded===true,'receipt_or_approval_not_clean');
 const disabled=await call('/api/internal-executor-run',executor,'POST',{taskId:id});
 assert(disabled.status===503&&disabled.body.error==='executor_disabled','executor_must_be_disabled_before_start');
 console.log('PASS: exactly one approved untouched task; executor OFF; no writes performed');
}
async function prepare(){
 ensureInput();
 const original=await fs.readFile('wrangler.toml','utf8');
 assert(original.includes('[vars]')&&original.includes('[ai]')&&original.includes('TEAM_INFERENCE_PROVIDER = "cloudflare"'),'expected_cloudflare_config_missing');
 let baseConfig=original.replace('[ai]',`TEAM_EXECUTOR_ENABLED = "false"
TEAM_EXECUTOR_CERTIFICATION_MODE = "false"
TEAM_EXECUTOR_GENERAL_RELEASED = "false"

[ai]`);
 const db=`
[[d1_databases]]
binding = "TEAM_DB"
database_name = "atlas-team-data"
database_id = "${process.env.TEAM_D1_DATABASE_ID}"
`;
 // The temporary file must preserve static assets, AI and D1 bindings.
 baseConfig+='\n'+db;
 // Optional model overrides are treated exactly as in the normal deploy pipeline.
 const model=process.env.TEAM_EXECUTOR_MODEL||'';
 const list=process.env.TEAM_ALLOWED_MODELS||'';
 if(model||list){
  const names=list.split(',').map(x=>x.trim()).filter(Boolean);
  assert(/^[A-Za-z0-9._:-]{1,128}$/.test(model)&&names.includes(model)&&names.length<=32&&names.every(x=>/^[A-Za-z0-9._:-]{1,128}$/.test(x)),'model_allowlist_invalid');
  baseConfig=baseConfig.replace('[ai]',`TEAM_EXECUTOR_MODEL = ${JSON.stringify(model)}
TEAM_ALLOWED_MODELS = ${JSON.stringify(names.join(','))}

[ai]`);
 }
 const expiry=new Date(Date.now()+8*60*1000).toISOString();
 const scoped=baseConfig.replace('TEAM_EXECUTOR_ENABLED = "false"','TEAM_EXECUTOR_ENABLED = "true"').replace('TEAM_EXECUTOR_CERTIFICATION_MODE = "false"','TEAM_EXECUTOR_CERTIFICATION_MODE = "true"').replace('[ai]',`TEAM_EXECUTOR_CERTIFICATION_TASK_ID = ${JSON.stringify(id)}
TEAM_EXECUTOR_CERTIFICATION_EXPIRES_AT = ${JSON.stringify(expiry)}

[ai]`);
 await fs.writeFile('wrangler.disabled.toml',baseConfig);
 await fs.writeFile('wrangler.certification.toml',scoped);
 console.log('Prepared temporary scoped/disabled configurations; neither includes general release authorization');
}
async function execute(){
 ensureInput();
 const scoped=await get('/api/internal-executor-certification-preflight?taskId='+encodeURIComponent(id),executor);
 assert(scoped.status===200&&scoped.body.ready===true&&scoped.body.checks?.withinCertificationWindow===true&&scoped.body.checks?.exactTaskPinned===true&&scoped.body.checks?.generalReleaseOff===true&&scoped.body.checks?.taskApproved===true&&scoped.body.checks?.cloudflareProvider===true,'certification_preflight_failed_http_'+scoped.status);
 const res=await fetch(base+'/api/internal-executor-run',{method:'POST',headers:{authorization:'Bearer '+executor,'content-type':'application/json'},body:JSON.stringify({taskId:id}),signal:AbortSignal.timeout(90000)});
 const outcome=await res.json().catch(()=>({}));
 if(res.status!==200||outcome.ok!==true){
  const stage=['provider','receipt'].includes(outcome.failureStage)?outcome.failureStage:'unknown';
  const reason=['provider_or_receipt_failure','executor_failed'].includes(outcome.reason)?outcome.reason:'unclassified';
  const observed=await get('/api/task-certification?taskId='+encodeURIComponent(id),owner).catch(()=>({status:0,body:{}}));
  throw Error('execution_not_verified_http_'+res.status+'_stage_'+stage+'_reason_'+reason+'_task_'+(observed.body.taskState||'unavailable'));
 }
 assert(outcome.state==='verified'&&outcome.outputType==='analysis-only'&&outcome.externalActionsPerformed===false&&typeof outcome.receiptId==='string','execution_success_payload_invalid');
 const verified=await get('/api/task-certification?taskId='+encodeURIComponent(id),owner);
 assert(verified.status===200&&verified.body.taskState==='verified'&&verified.body.evidenceRecorded===true&&verified.body.approvalRecorded===true&&verified.body.receiptCount===1&&verified.body.receiptIds?.includes(outcome.receiptId),'persisted_receipt_mismatch');
 console.log('PASS: single live Workers AI task and matching immutable D1 receipt');
}
async function verifyDisabled(){
 // Cloudflare edge rollout may lag the successful Wrangler deploy.
 // Verify the service gate repeatedly without any task mutation; success
 // requires an explicit executor_disabled response, never a generic 503.
 const observed=[];
 for(let attempt=0;attempt<8;attempt++){
  const result=await call('/api/internal-executor-run',executor,'POST',{taskId:id});
  if(result.status===503&&result.body.error==='executor_disabled'){
   console.log('PASS: production executor disabled after certification');
   return;
  }
  observed.push(result.status+':'+String(result.body.error||'unknown').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,40));
  if(attempt<7)await new Promise(resolve=>setTimeout(resolve,2500));
 }
 throw Error('executor_not_disabled_after_rollback_observed_'+observed.join('_').slice(0,85));
}
const operation=process.argv[2];
try{
 if(operation==='preflight')await preflight();
 else if(operation==='prepare')await prepare();
 else if(operation==='execute')await execute();
 else if(operation==='verify-disabled')await verifyDisabled();
 else throw Error('unknown_operation');
}catch(e){console.error('Certification blocked: '+String(e.message).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,120));process.exitCode=1}
