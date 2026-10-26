import {verifyStagingCertificationChain} from './staging-certification-chain.mjs';

// Trusted deployment trust anchors MUST be supplied by server-side configuration,
// never by a client request or from the submitted signed envelope.
// No operational readiness or execution authorization can be granted here.
const fail=(reason,phase)=>({ok:false,reason,phase,readinessGranted:false});
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function time(value){return typeof value==='string'&&ISO.test(value)?Date.parse(value):NaN}
export async function verifyTrustedStagingAttestation({db,envelope,trust,now=Date.now()}={}){
 if(!trust||typeof trust!=='object'||trust.environment!=='staging')return fail('trusted_staging_context_missing','trust');
 if(!trust.pinnedIssuerId||!trust.pinnedKeyId||!trust.pinnedPublicKey||
    !trust.sourceCommit||!trust.databaseId||!trust.deploymentId)return fail('trust_anchor_incomplete','trust');
 if(!envelope?.record||envelope.record.issuerId!==trust.pinnedIssuerId)return fail('issuer_identity_mismatch','issuer');
 if(!Array.isArray(trust.revokedKeyIds)||trust.revokedKeyIds.includes(trust.pinnedKeyId))return fail('key_revoked_or_status_unknown','issuer');
 const keyStart=time(trust.keyValidFrom),keyEnd=time(trust.keyValidUntil);
 const observed=time(envelope.record.observedAt);
 if(!Number.isFinite(keyStart)||!Number.isFinite(keyEnd)||!Number.isFinite(observed)||keyStart>=keyEnd||
    observed<keyStart||observed>=keyEnd||now>=keyEnd)return fail('issuer_key_outside_trust_window','issuer');
 const context={
  environment:trust.environment,sourceCommit:trust.sourceCommit,
  databaseId:trust.databaseId,deploymentId:trust.deploymentId,
  pinnedKeyId:trust.pinnedKeyId,pinnedPublicKey:trust.pinnedPublicKey
 };
 const result=await verifyStagingCertificationChain({db,envelope,context,now});
 if(!result.ok)return fail(result.reason,result.phase);
 return {
  ok:true,issuerIdentityVerified:true,keyLifecycleVerified:true,
  signatureVerified:true,durableEvidenceCorroborated:true,
  gate:result.gate,taskId:result.taskId,readinessGranted:false,
  requiresIndependentTrustAnchorProvisioning:true,
  requiresSeparatelyAuthorizedRelease:true
 };
}
