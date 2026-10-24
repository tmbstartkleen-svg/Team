import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDeploymentManifest} from '../lib/deployment-provenance-manifest.mjs';
const manifest={schema_version:1,repository:'tmbstartkleen-svg/Team',source_ref:'refs/heads/main',source_commit:'a'.repeat(40),artifact_sha256:'b'.repeat(64),worker_name:'atlas-team',environment:'production',worker_version_id:'04c3bdb1-d07e-4893-98a1-2eaccd6614a1',deployment_id:'6d8e6f82-f1f0-4ba8-a8b7-38e1c383b155',deployed_percentage:100,github_workflow_run_id:123,github_workflow_run_attempt:1,github_workflow_url:'https://github.com/tmbstartkleen-svg/Team/actions/runs/123',deployment_observed_at:'2026-10-21T18:35:42Z'};
test('valid shape is not proof and cannot authorize release',()=>assert.deepEqual(validateDeploymentManifest(manifest),{valid:true,provenanceVerified:false,releaseAuthorized:false}));
test('invalid or spoofed manifest structure fails closed',()=>{
 const changes=[{repository:'other/Team'},{source_ref:'refs/heads/feature'},{source_commit:'bad'},{artifact_sha256:'bad'},{worker_name:'different'},{environment:'staging'},{worker_version_id:'bad'},{deployment_id:'bad'},{deployed_percentage:50},{github_workflow_run_attempt:0},{github_workflow_url:'https://example.com'},{deployment_observed_at:'invalid'}];
 for(const patch of changes)assert.equal(validateDeploymentManifest({...manifest,...patch}).valid,false,JSON.stringify(patch));
 assert.equal(validateDeploymentManifest(null).valid,false);
});
