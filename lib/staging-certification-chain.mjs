import {verifySignedCertificationEvidence} from './certification-evidence-signature.mjs';
import {verifyCertificationEvidenceAgainstD1} from './certification-evidence-d1-verifier.mjs';

// Independent, read-only corroboration chain. Successful checks do not imply
// release authorization, legitimate issuer key provisioning, or live model proof.
const fail=(reason,phase)=>({ok:false,reason,phase,readinessGranted:false});
export async function verifyStagingCertificationChain({db,envelope,context,now=Date.now()}={}){
 if(!context||typeof context!=='object'||context.environment!=='staging')
  return fail('staging_context_required','environment');
 if(!db?.prepare)return fail('database_not_bound','database');
 const signature=await verifySignedCertificationEvidence(envelope,context,now);
 if(!signature.ok)return fail(signature.reason,'signature');
 const provenance=await verifyCertificationEvidenceAgainstD1(db,envelope.record,context,now);
 if(!provenance.ok)return fail(provenance.reason,'provenance');
 return {
  ok:true,signatureVerified:true,durableEvidenceCorroborated:true,
  gate:envelope.record.gate,taskId:envelope.record.taskId,
  readinessGranted:false,
  requiresTrustedDeploymentAndIssuerAttestation:true,
  requiresSeparatelyAuthorizedRelease:true
 };
}
