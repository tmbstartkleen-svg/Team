import {checkDeploymentArtifactDigest} from './deployment-artifact-integrity.mjs';
import {observeDeploymentProvenance} from './deployment-provenance-observer.mjs';

// Read-only correlation of independently obtained GitHub and Cloudflare metadata,
// plus independently supplied artifact bytes. No signature or actual bundle
// provenance claim is possible without an authenticated, independently retrievable
// Cloudflare artifact linked to the deployment version.
export async function checkDeploymentEvidence(manifest, providers={}) {
 const fail={providerMatches:false,digestMatches:false,evidenceCorrelated:false,
   provenanceVerified:false,releaseAuthorized:false};
 if(typeof providers.fetchGithubRun!=='function'||typeof providers.fetchCloudflareDeployment!=='function'
   ||typeof providers.fetchArtifactBytes!=='function')return fail;
 try {
  const observed=await observeDeploymentProvenance(manifest,providers);
  if(!observed.providerMatches)return fail;
  const artifact=await providers.fetchArtifactBytes(manifest.worker_version_id);
  // Reject self-asserted digests or blobs without provider identity. Bytes must
  // carry a version identifier returned independently by the read-only adapter.
  if(artifact?.version_id!==manifest.worker_version_id)return fail;
  const digest=checkDeploymentArtifactDigest(manifest,artifact?.bytes);
  return {providerMatches:true,digestMatches:digest.digestMatches,
    evidenceCorrelated:digest.digestMatches,provenanceVerified:false,
    releaseAuthorized:false};
 }catch{return fail}
}
