import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkDeploymentArtifactDigest} from '../lib/deployment-artifact-integrity.mjs';
const bundle=Buffer.from('offline-test-bundle');
const m={schema_version:1,repository:'tmbstartkleen-svg/Team',source_ref:'refs/heads/main',source_commit:'a'.repeat(40),artifact_sha256:createHash('sha256').update(bundle).digest('hex'),worker_name:'atlas-team',environment:'production',worker_version_id:'04c3bdb1-d07e-4893-98a1-2eaccd6614a1',deployment_id:'6d8e6f82-f1f0-4ba8-a8b7-38e1c383b155',deployed_percentage:100,github_workflow_run_id:123,github_workflow_run_attempt:1,github_workflow_url:'https://github.com/tmbstartkleen-svg/Team/actions/runs/123',deployment_observed_at:'2026-10-21T18:35:42Z'};
test('matching artifact digest is not deployment proof or release permission',()=>{
 assert.deepEqual(checkDeploymentArtifactDigest(m,bundle),{digestMatches:true,provenanceVerified:false,releaseAuthorized:false});
});
test('changed, missing, malformed or empty bundles fail closed',()=>{
 for(const value of [Buffer.from('tampered'),Buffer.alloc(0),undefined,'offline-test-bundle'])
  assert.equal(checkDeploymentArtifactDigest(m,value).digestMatches,false);
 assert.equal(checkDeploymentArtifactDigest({...m,artifact_sha256:'bogus'},bundle).digestMatches,false);
});
