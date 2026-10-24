import {createHash, timingSafeEqual} from 'node:crypto';
import {validateDeploymentManifest} from './deployment-provenance-manifest.mjs';

// Pure integrity check only. The caller must independently authenticate artifact
// origin and ensure the bytes are the exact bundle deployed by Cloudflare.
export function checkDeploymentArtifactDigest(manifest, bundleBytes) {
 const fail={digestMatches:false,provenanceVerified:false,releaseAuthorized:false};
 if(validateDeploymentManifest(manifest).valid!==true
   ||!(Buffer.isBuffer(bundleBytes)||bundleBytes instanceof Uint8Array)
   ||bundleBytes.byteLength===0) return fail;
 const expected=Buffer.from(manifest.artifact_sha256,'hex');
 const actual=createHash('sha256').update(bundleBytes).digest();
 return {digestMatches:timingSafeEqual(expected,actual),
   provenanceVerified:false,releaseAuthorized:false};
}
