import {parseAuditInstant} from './audit-chronology.mjs';
import {canonicalSignedAuditPayload} from './signed-audit-canonical.mjs';
// Authenticated read-only provenance lookup. Events must be signed by a pinned
// Ed25519 audit issuer; a caller-supplied sourceVerified flag has no authority.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const SHA=/^[0-9a-f]{40}$/;
const PUB=/^[A-Za-z0-9_-]{43}$/;
const kinds=new Set(['owner-authenticated-approval','observed-replay-denial']);
const decode=s=>{if(typeof s!=='string'||!/^[A-Za-z0-9_-]+$/.test(s))throw Error('invalid_base64url');const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(b,c=>c.charCodeAt(0))};
export function createSignedProvenanceInspectors({readEvent,publicKey,issuer,deploymentCommit,now,cryptoImpl=globalThis.crypto}={}){
 const disabled=async()=>({});
 if(typeof readEvent!=='function'||typeof issuer!=='string'||!ID.test(issuer)||!SHA.test(deploymentCommit||'')
    ||!PUB.test(publicKey||'')||!Number.isFinite(Date.parse(now||''))||!cryptoImpl?.subtle)
  return Object.freeze({approvalEvidence:disabled,replayEvidence:disabled});
 let keyPromise;
 const inspect=kind=>async scope=>{
  if(!kinds.has(kind)||!ID.test(scope?.taskId||'')||!ID.test(scope?.stepId||'')
     ||!ID.test(scope?.idempotencyKey||''))return {};
  try{
   const signed=await readEvent(Object.freeze({kind,taskId:scope.taskId,stepId:scope.stepId,idempotencyKey:scope.idempotencyKey}));
   const e=signed?.event;
   if(!e||signed?.issuer!==issuer||e.kind!==kind||e.taskId!==scope.taskId
      ||e.stepId!==scope.stepId||e.idempotencyKey!==scope.idempotencyKey
      ||!ID.test(e.eventId||'')||!ID.test(e.originSourceId||'')
      ||!ID.test(e.originEventId||'')||e.deploymentCommit!==deploymentCommit
      ||!Number.isFinite(Date.parse(e.timestamp||'')))return {};
   const age=parseAuditInstant(now)-parseAuditInstant(e.timestamp);
   const sourceAge=parseAuditInstant(e.timestamp)-parseAuditInstant(e.sourceEventAt);
   if(!Number.isFinite(age)||!Number.isFinite(sourceAge)||age<0||age>86400000
      ||sourceAge<0||sourceAge>300000||!/^[-_A-Za-z0-9]{86}$/.test(signed.signature||''))return {};
   if(kind==='owner-authenticated-approval'&&!(e.approved===true&&e.ownerAuthenticated===true
      &&e.approvedBeforeExecution===true&&ID.test(e.ownerPrincipal||'')))return {};
   if(kind==='observed-replay-denial'&&!(e.denied===true&&e.reservationObserved===true))return {};
   if(!keyPromise)keyPromise=cryptoImpl.subtle.importKey('raw',decode(publicKey),{name:'Ed25519'},false,['verify']);
   const key=await keyPromise;
   // Bind all stored fields, including security booleans, under a versioned domain.
   const payload=canonicalSignedAuditPayload(issuer,e);
   const verified=await cryptoImpl.subtle.verify('Ed25519',key,decode(signed.signature),payload);
   if(!verified)return {};
   return kind==='owner-authenticated-approval'
    ?{kind,sourceVerified:true,taskId:e.taskId,stepId:e.stepId,approved:true,ownerAuthenticated:true,approvedBeforeExecution:true,approvedAt:e.sourceEventAt,deploymentCommit:e.deploymentCommit,originSourceId:e.originSourceId,originEventId:e.originEventId}
    :{kind,sourceVerified:true,taskId:e.taskId,stepId:e.stepId,idempotencyKey:e.idempotencyKey,denied:true,replayObservedAt:e.sourceEventAt,deploymentCommit:e.deploymentCommit,originSourceId:e.originSourceId,originEventId:e.originEventId};
  }catch{return {}}
 };
 return Object.freeze({approvalEvidence:inspect('owner-authenticated-approval'),replayEvidence:inspect('observed-replay-denial')});
}
