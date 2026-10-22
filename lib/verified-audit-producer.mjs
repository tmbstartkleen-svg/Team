import {createVerifiedOriginObserver} from './verified-origin-observer.mjs';
import {createSignedAuditEventProducer} from './signed-audit-event-producer.mjs';
// Server-only explicit composition: distinct source verification and audit signing
// keys. Never derived from a client request, owner flag or historical audit row.
// No HTTP route, executor, approval mutation, or automatic invocation.
const SHA=/^[a-f0-9]{40}$/;
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const PUB=/^[A-Za-z0-9_-]{43}$/;
export function buildVerifiedAuditProducer({db,readOrigin,originIssuer,originPublicKey,
 auditIssuer,auditPrivateKey,deploymentCommit,now,cryptoImpl}={}){
 const disabled=Object.freeze({record:async()=>({recorded:false})});
 if(!db?.prepare||typeof readOrigin!=='function'
   ||!ID.test(originIssuer||'')||!ID.test(auditIssuer||'')
   ||originIssuer===auditIssuer||!PUB.test(originPublicKey||'')
   ||!SHA.test(deploymentCommit||'')||auditPrivateKey?.type!=='private'
   ||!Number.isFinite(Date.parse(now||'')))return disabled;
 const trusted=createVerifiedOriginObserver({readOrigin,issuer:originIssuer,
   publicKey:originPublicKey,now,cryptoImpl});
 return createSignedAuditEventProducer({db,issuer:auditIssuer,privateKey:auditPrivateKey,
   deploymentCommit,observeTrustedEvent:trusted,clock:()=>now,cryptoImpl});
}
