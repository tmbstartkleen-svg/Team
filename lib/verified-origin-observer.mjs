// Independently signed origin observation adapter. The audit signer may only
// consume verified upstream observations, not a request-supplied approval boolean.
// This adapter does not create, approve or execute anything.
import {canonicalSignedAuditPayload} from './signed-audit-canonical.mjs';
import {parseAuditInstant} from './audit-chronology.mjs';
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const KEY=/^[A-Za-z0-9_-]{43}$/;
const blocked=new Set(['cert-github-read-20261018','cert-github-read-20261019-v2']);
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),x=>x.charCodeAt(0));
export function createVerifiedOriginObserver({readOrigin,issuer,publicKey,sourceId,now,cryptoImpl=globalThis.crypto}={}){
 const disabled=async()=>null;
 if(typeof readOrigin!=='function'||!ID.test(issuer||'')||!ID.test(sourceId||'')||!KEY.test(publicKey||'')
   ||!Number.isFinite(parseAuditInstant(now))||!cryptoImpl?.subtle)return disabled;
 let imported;
 return async scope=>{
  if(!scope||blocked.has(scope.taskId)||![scope.taskId,scope.stepId,scope.idempotencyKey].every(v=>ID.test(v||'')))return null;
  if(!['owner-authenticated-approval','observed-replay-denial'].includes(scope.kind))return null;
  try{
   const signed=await readOrigin(Object.freeze({...scope}));
   const e=signed?.event;
   if(signed?.issuer!==issuer||!e||e.kind!==scope.kind||e.taskId!==scope.taskId
     ||e.stepId!==scope.stepId||e.idempotencyKey!==scope.idempotencyKey
     ||!ID.test(e.eventId||'')||e.sourceId!==sourceId
     ||typeof signed.signature!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(signed.signature))return null;
   const age=parseAuditInstant(now)-parseAuditInstant(e.sourceEventAt);
   if(!Number.isFinite(age)||age<0||age>300000)return null;
   const approved=e.kind==='owner-authenticated-approval';
   if(approved&&(!ID.test(e.ownerPrincipal||'')||e.approved!==true||e.ownerAuthenticated!==true||e.approvedBeforeExecution!==true))return null;
   if(!approved&&(e.denied!==true||e.reservationObserved!==true))return null;
   imported ||= cryptoImpl.subtle.importKey('raw',bytes(publicKey),{name:'Ed25519'},false,['verify']);
   const key=await imported;
   if(!await cryptoImpl.subtle.verify('Ed25519',key,bytes(signed.signature),canonicalSignedAuditPayload(issuer,e)))return null;
   return Object.freeze({...e,originAuthenticated:true});
  }catch{return null}
 };
}
