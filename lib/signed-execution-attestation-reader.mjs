import {createSignedProvenanceInspectors} from './signed-provenance-inspectors.mjs';
import {createExecutionAttestationReader} from './execution-attestation-reader.mjs';
// Server-side read-only composition. No production issuer, source, or credentials
// are supplied automatically. Missing prerequisites leave certification blocked.
export function createSignedExecutionAttestationReader({db,readEvent,publicKey,issuer,now,cryptoImpl}={}){
 const signed=createSignedProvenanceInspectors({readEvent,publicKey,issuer,now,cryptoImpl});
 return createExecutionAttestationReader({
  db,approvalEvidence:signed.approvalEvidence,replayEvidence:signed.replayEvidence
 });
}
