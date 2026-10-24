import {createVerifiedOriginObserver} from './verified-origin-observer.mjs';
import {createSignedAuditEventProducer} from './signed-audit-event-producer.mjs';
// Server-only explicit composition: distinct source verification and audit signing
// keys. Never derived from a client request, owner flag or historical audit row.
// No HTTP route, executor, approval mutation, or automatic invocation.
const SHA=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const PUB=/^[A-Za-z0-9_-]{43}$/;
export function buildVerifiedAuditProducer({db,readOrigin,originIssuer,originPublicKey,
 auditIssuer,auditPrivateKey,deploymentCommit,originSourceId,now,cryptoImpl}={}){
 const disabled=Object.freeze({record:async()=>({recorded:false})});
 if(!db?.prepare||typeof readOrigin!=='function'
   ||!ID.test(originIssuer||'')||!ID.test(auditIssuer||'')
   ||originIssuer===auditIssuer||!ID.test(originSourceId||'')||!PUB.test(originPublicKey||'')
   ||!SHA.test(deploymentCommit||'')||auditPrivateKey?.type!=='private'
   ||!Number.isFinite(Date.parse(now||'')))return disabled;
 // Verify the origin public key is not the audit signing key, even if issuer labels differ.
 // This blocks same-key self-attestation masquerading as independent provenance.
 const trusted=createVerifiedOriginObserver({readOrigin,issuer:originIssuer,
   publicKey:originPublicKey,sourceId:originSourceId,now,cryptoImpl});
 // Before any evidence can be produced, prove cryptographic key separation.
 // A non-extractable audit private key is supported through Ed25519 sign/verify.
 const disabledUntilChecked=Object.freeze({record:async scope=>{
  try{
   if(!cryptoImpl?.subtle?.importKey||!cryptoImpl?.subtle?.sign||!cryptoImpl?.subtle?.verify)return {recorded:false};
   const raw=Uint8Array.from(atob(originPublicKey.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-originPublicKey.length%4)%4)),x=>x.charCodeAt(0));
   const pub=await cryptoImpl.subtle.importKey('raw',raw,'Ed25519',false,['verify']);
   const probe=new TextEncoder().encode('atlas-key-separation-v1');
   const sig=await cryptoImpl.subtle.sign('Ed25519',auditPrivateKey,probe);
   // If origin verifies a signature from the audit key, these identities are not independent.
   if(await cryptoImpl.subtle.verify('Ed25519',pub,sig,probe))return {recorded:false};
   const producer=createSignedAuditEventProducer({db,issuer:auditIssuer,privateKey:auditPrivateKey,
     deploymentCommit,observeTrustedEvent:trusted,clock:()=>now,cryptoImpl});
   return producer.record(scope);
  }catch{return {recorded:false}}
 }});
 return disabledUntilChecked;
}
