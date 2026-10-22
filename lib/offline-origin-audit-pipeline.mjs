import {createD1OriginObservationReader} from './d1-origin-observation-reader.mjs';
import {buildVerifiedAuditProducer} from './verified-audit-producer.mjs';
// Explicit operator-only composition; this creates no endpoint or scheduler.
// Source observations MUST already be independently signed by an external issuer.
// Does not generate credentials or authorize task activity.
const id=/^[A-Za-z0-9_.:-]{8,128}$/;
const sha=/^[a-f0-9]{40}$/;
export function buildOfflineOriginToAuditPipeline({db,originIssuer,originSourceId,originPublicKey,
 auditIssuer,auditPrivateKey,deploymentCommit,now,cryptoImpl}={}){
 const disabled=Object.freeze({record:async()=>({recorded:false})});
 if(!db?.prepare||!id.test(originIssuer||'')||!id.test(originSourceId||'')
   ||!id.test(auditIssuer||'')||!sha.test(deploymentCommit||'')
   ||typeof originPublicKey!=='string'||originPublicKey.length!==43
   ||auditPrivateKey?.type!=='private')return disabled;
 return buildVerifiedAuditProducer({
  db,readOrigin:createD1OriginObservationReader(db),originIssuer,originSourceId,
  originPublicKey,auditIssuer,auditPrivateKey,deploymentCommit,now,cryptoImpl
 });
}
