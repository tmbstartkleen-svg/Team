import {createD1SignedAuditEventSource} from './d1-signed-audit-event-source.mjs';
import {createSignedExecutionAttestationReader} from './signed-execution-attestation-reader.mjs';
// Read-only server-side production adapter. No HTTP endpoint or approval method.
// Operator configuration must be complete; no request-controlled fallbacks.
const SHA=/^[a-f0-9]{40}$/;
const ISSUER=/^[A-Za-z0-9_.:-]{8,128}$/;
const KEY=/^[A-Za-z0-9_-]{43}$/;
export function buildProductionSignedAttestationReader(env={},runtime={}){
 const disabled=async()=>({verified:false});
 if(env.TEAM_SIGNED_ATTESTATION_READ_ENABLED!=='true'
  ||!env.TEAM_DB?.prepare||!SHA.test(env.TEAM_DEPLOYMENT_COMMIT||'')
  ||!ISSUER.test(env.TEAM_AUDIT_SIGNER_ISSUER||'')
  ||!KEY.test(env.TEAM_AUDIT_SIGNER_PUBLIC_KEY||'')
  ||!Number.isFinite(Date.parse(runtime.now||'')))return disabled;
 return createSignedExecutionAttestationReader({
  db:env.TEAM_DB,readEvent:createD1SignedAuditEventSource({db:env.TEAM_DB}),
  publicKey:env.TEAM_AUDIT_SIGNER_PUBLIC_KEY,issuer:env.TEAM_AUDIT_SIGNER_ISSUER,
  deploymentCommit:env.TEAM_DEPLOYMENT_COMMIT,now:runtime.now,
  cryptoImpl:runtime.cryptoImpl
 });
}
