import {assessTeamRelease,RELEASE_EVIDENCE_REQUIREMENTS} from './team-release-certification.mjs';
import {assessLaunchReadiness} from './launch-readiness.mjs';

// Public, read-only aggregation. Never accepts a caller-supplied proof/approval.
// CI, config, or preflight results do not stand in for live certification.
const MILESTONES=Object.freeze([
 {id:'github-read',title:'Owner-authorized GitHub read',requirements:['real-read-adapter','authenticated-executor']},
 {id:'github-write',title:'Separately authorized GitHub write',requirements:['approved-write-adapter']},
 {id:'multi-persona',title:'Dependent multi-persona execution',requirements:['persona-e2e']},
 {id:'production-reliability',title:'Production reliability and security',requirements:['ci','merged-main','deployed-worker','durable-recovery','monitoring','rollback','d1-migrations','authenticated-owner']},
 {id:'owner-signoff',title:'Final owner signoff',requirements:['owner-signoff']}
]);
const SAFE_ID=/^[a-z][a-z0-9-]{0,64}$/;
export function summarizeReleaseEvidence({launch,releaseEvidence={}}={}){
 if(!launch||launch.ok!==true||!Array.isArray(launch.checks))throw new TypeError('invalid_launch_snapshot');
 const evaluation=assessTeamRelease(releaseEvidence);
 const gates=launch.checks.map(c=>({id:String(c.id),required:c.required===true,ready:c.ready===true}));
 if(gates.some(g=>!SAFE_ID.test(g.id)))throw new TypeError('invalid_gate_id');
 const verified=new Set(evaluation.checks.filter(x=>x.verified).map(x=>x.key));
 const milestones=MILESTONES.map(m=>({
  id:m.id,title:m.title,certified:m.requirements.every(k=>verified.has(k)),
  missingEvidence:m.requirements.filter(k=>!verified.has(k))
 }));
 // Even complete metadata may not authorize activation: separate runtime signal and owner release.
 const runtimeActive=launch.productionOperational===true&&launch.agentsActive===true;
 const launchAuthorized=runtimeActive&&evaluation.launchReady&&launch.betaReady===true;
 return {
  ok:true,readOnly:true,source:'server-release-gates',releaseAuthority:'owner-only',
  productionOperational:runtimeActive,launchAuthorized,
  certificationStatus:launchAuthorized?'operational':'blocked',
  certificationMilestones:milestones,
  remainingMilestones:milestones.filter(m=>!m.certified).length,
  gates,requiredGatesOpen:gates.filter(g=>g.required&&!g.ready).map(g=>g.id),
  releaseEvidence:{required:RELEASE_EVIDENCE_REQUIREMENTS.length,verified:evaluation.checks.filter(x=>x.verified).length,missing:evaluation.missing},
  safety:{generalExecutionNeverEnabledByThisEndpoint:true,ownerApprovalRequired:true,legacyCertificationTaskMustRemainUnapproved:true},
  note:'No private evidence, credentials, task contents, or operator grants are exposed.'
 };
}
export async function getReleaseEvidenceDashboard(env={}){
 const launch=await assessLaunchReadiness(env);
 // No trusted live evidence store is connected here. Never substitute process env or query params.
 return summarizeReleaseEvidence({launch,releaseEvidence:{}});
}
export async function handleReleaseEvidenceDashboard(request,env={}){
 if(request.method!=='GET')return new Response(JSON.stringify({ok:false,error:'method_not_allowed'}),{status:405,headers:{'content-type':'application/json','allow':'GET','cache-control':'no-store'}});
 try{
  const result=await getReleaseEvidenceDashboard(env);
  return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
 }catch{
  return new Response(JSON.stringify({ok:false,error:'readiness_unavailable',productionOperational:false,launchAuthorized:false}),{status:503,headers:{'content-type':'application/json','cache-control':'no-store'}});
 }
}
