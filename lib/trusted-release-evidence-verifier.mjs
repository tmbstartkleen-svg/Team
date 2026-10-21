import {RELEASE_EVIDENCE_REQUIREMENTS} from './team-release-certification.mjs';

// No network, credentials, persistence, or public ingestion. Source verifiers are
// injected trusted services, never supplied by a request or model response.
const allowed=new Set(RELEASE_EVIDENCE_REQUIREMENTS);
const HEX64=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const families=Object.freeze({
  github:'github-actions',
  cloudflare:'cloudflare-deployment',
  d1:'cloudflare-d1',
  owner:'owner-signed-attestation'
});
const sources=Object.freeze({
  ci:['github-actions'], 'merged-main':['github-actions'],
  'deployed-worker':['cloudflare-deployment'],
  'd1-migrations':['cloudflare-d1'],
  'authenticated-owner':['owner-signed-attestation'],
  'authenticated-executor':['owner-signed-attestation'],
  'real-read-adapter':['owner-signed-attestation'],
  'approved-write-adapter':['owner-signed-attestation'],
  'durable-recovery':['owner-signed-attestation'],
  'persona-e2e':['owner-signed-attestation'],
  monitoring:['owner-signed-attestation'],
  rollback:['owner-signed-attestation'],
  'owner-signoff':['owner-signed-attestation']
});
function wellFormed(e,{commit,environment}){
 return e&&typeof e==='object'&&allowed.has(e.requirement_key)
  &&sources[e.requirement_key].includes(e.source_family)
  &&typeof e.issuer==='string'&&e.issuer.length>=3
  &&typeof e.artifact_ref==='string'&&e.artifact_ref.length>=8
  &&HEX64.test(e.artifact_sha256||'')
  &&e.deployment_commit===commit&&e.environment===environment
  &&typeof e.verification_method==='string'&&e.verification_method.length>=8
  &&ID.test(e.id||'')&&Number.isFinite(Date.parse(e.event_time||''));
}
export async function evaluateTrustedReleaseEvidence({events=[],deploymentCommit,environment='production',now,verifiers={}}={}){
 if(!SHA.test(deploymentCommit||'')||!['production','staging'].includes(environment)
    ||!Array.isArray(events)||!Number.isFinite(Date.parse(now||'')))
   throw new TypeError('invalid_release_evidence_context');
 // Missing evidence and verifier failures are never proof of execution.
 // A malformed row can be a corrupted revocation; never silently discard it.
 if(events.some(e=>!wellFormed(e,{commit:deploymentCommit,environment})))return {};
 // A forged or damaged revocation chain must not silently certify older proof.
 if(events.some(e=>e.verdict==='revoked'&&(!ID.test(e.supersedes_event_id||'')||!events.some(p=>p.id===e.supersedes_event_id&&p.verdict==='verified'&&p.requirement_key===e.requirement_key))))return {};
 const valid=events;
 const byId=new Map();
 for(const e of valid){
  if(byId.has(e.id))byId.set(e.id,null); // duplicate IDs are ambiguous
  else byId.set(e.id,e);
 }
 const revoked=new Set();
 for(const e of valid){
  if(e.verdict!=='revoked'&&e.verdict!=='rejected')continue;
  if(!ID.test(e.supersedes_event_id||''))continue;
  const prior=byId.get(e.supersedes_event_id);
  if(prior&&prior.verdict==='verified'&&prior.requirement_key===e.requirement_key
    &&prior.environment===e.environment&&prior.deployment_commit===e.deployment_commit)
   revoked.add(prior.id);
 }
 // Release-sensitive execution proof is short-lived. Other categories must have
 // dedicated attestation verifiers before being eligible; never extend a global TTL.
 const proof={};
 for(const requirement of RELEASE_EVIDENCE_REQUIREMENTS){
  const candidates=valid.filter(e=>e.requirement_key===requirement&&e.verdict==='verified'
    &&byId.get(e.id)===e&&!revoked.has(e.id));
  // All evidence requires independent artifact verification, even if stored as verified.
  for(const e of candidates){
   const age=Date.parse(now)-Date.parse(e.event_time);
   const ttlMs=24*60*60*1000;
   if(!Number.isFinite(age)||age<0||age>ttlMs)continue;
   const verify=verifiers[e.source_family];
   if(typeof verify!=='function')continue;
   try{
    const result=await verify(Object.freeze({
      requirement:e.requirement_key,issuer:e.issuer,reference:e.artifact_ref,
      digest:e.artifact_sha256,commit:e.deployment_commit,environment:e.environment,
      method:e.verification_method
    }));
    if(result?.verified===true&&result?.artifactDigest===e.artifact_sha256&&result?.issuer===e.issuer){
     proof[requirement]={verified:true,reference:e.artifact_ref};
     break;
    }
   }catch{/* fail closed */}
  }
 }
 return proof;
}
