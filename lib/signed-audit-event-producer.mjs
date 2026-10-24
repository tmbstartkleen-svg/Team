import {parseAuditInstant} from './audit-chronology.mjs';
import {canonicalSignedAuditPayload} from './signed-audit-canonical.mjs';
// Private, server-only signing component. Never exposed by HTTP and never
// manufactures authorization from owner_approved, request input or model text.
// A separately authenticated observer is required before a signed event exists.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const SHA=/^[a-f0-9]{40}$/;
const blocked=new Set(['cert-github-read-20261018','cert-github-read-20261019-v2']);
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function createSignedAuditEventProducer({db,issuer,deploymentCommit,privateKey,observeTrustedEvent,clock=()=>new Date().toISOString(),cryptoImpl=globalThis.crypto}={}){
 const enabled=Boolean(db?.prepare&&ID.test(issuer||'')&&SHA.test(deploymentCommit||'')
    &&privateKey?.type==='private'&&typeof observeTrustedEvent==='function'
    &&cryptoImpl?.subtle?.sign&&typeof cryptoImpl.randomUUID==='function');
 return Object.freeze({
  async record({kind,taskId,stepId,idempotencyKey}={}){
   if(!enabled||!['owner-authenticated-approval','observed-replay-denial'].includes(kind)
      ||![taskId,stepId,idempotencyKey].every(x=>ID.test(x||''))
      ||blocked.has(taskId))return {recorded:false};
   try{
    // No caller-provided approved/denied/ownerVerified flags may be trusted.
    const trusted=await observeTrustedEvent(Object.freeze({kind,taskId,stepId,idempotencyKey}));
    if(trusted?.originAuthenticated!==true||!ID.test(trusted?.sourceId||'')||!ID.test(trusted?.eventId||'')||trusted?.taskId!==taskId
      ||trusted?.stepId!==stepId||trusted?.idempotencyKey!==idempotencyKey
      ||trusted?.kind!==kind)return {recorded:false};
    const isApproval=kind==='owner-authenticated-approval';
    if(isApproval&&(!ID.test(trusted.ownerPrincipal||'')||trusted.approved!==true
      ||trusted.ownerAuthenticated!==true||trusted.approvedBeforeExecution!==true))return {recorded:false};
    if(!isApproval&&(trusted.denied!==true||trusted.reservationObserved!==true))return {recorded:false};
    const timestamp=clock();
    const observedAt=trusted.sourceEventAt;
    const signingTime=parseAuditInstant(timestamp),sourceTime=parseAuditInstant(observedAt);
    if(!Number.isFinite(signingTime)||!Number.isFinite(sourceTime)||sourceTime>signingTime
       ||signingTime-sourceTime>5*60*1000)return {recorded:false};
    const eventId='audit-'+cryptoImpl.randomUUID();
    const event={eventId,kind,taskId,stepId,idempotencyKey,deploymentCommit,timestamp,sourceEventAt:observedAt,originSourceId:trusted.sourceId,originEventId:trusted.eventId};
    if(isApproval){
     Object.assign(event,{ownerPrincipal:trusted.ownerPrincipal,approved:true,
       ownerAuthenticated:true,approvedBeforeExecution:true});
    }else Object.assign(event,{denied:true,reservationObserved:true});
    const payload=canonicalSignedAuditPayload(issuer,event);
    const signature=b64(new Uint8Array(await cryptoImpl.subtle.sign(
      {name:'Ed25519'},privateKey,payload)));
    if(signature.length!==86)return {recorded:false};
    const saved=await db.prepare('INSERT INTO team_signed_audit_events(id,kind,task_id,step_id,idempotency_key,issuer,event_json,signature) VALUES(?,?,?,?,?,?,?,?)')
      .bind(eventId,kind,taskId,stepId,idempotencyKey,issuer,JSON.stringify(event),signature).run();
    if(saved?.meta?.changes!==1)return {recorded:false};
    return {recorded:true,eventId};
   }catch{
    // Duplicate scopes, missing D1 migration, source outages, and sign failures block.
    return {recorded:false};
   }
  }
 });
}
