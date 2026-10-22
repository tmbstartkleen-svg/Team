import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {checkDeploymentEvidence} from '../lib/deployment-evidence-correlator.mjs';
const bytes=Buffer.from('trusted-test-bundle');
const m={schema_version:1,repository:'tmbstartkleen-svg/Team',source_ref:'refs/heads/main',source_commit:'a'.repeat(40),artifact_sha256:createHash('sha256').update(bytes).digest('hex'),worker_name:'atlas-team',environment:'production',worker_version_id:'04c3bdb1-d07e-4893-98a1-2eaccd6614a1',deployment_id:'6d8e6f82-f1f0-4ba8-a8b7-38e1c383b155',deployed_percentage:100,github_workflow_run_id:123,github_workflow_run_attempt:1,github_workflow_url:'https://github.com/tmbstartkleen-svg/Team/actions/runs/123',deployment_observed_at:'2026-10-21T18:35:42Z'};
const providers={fetchGithubRun:async()=>({id:123,run_attempt:1,repository:{full_name:m.repository},head_sha:m.source_commit,head_branch:'main',event:'push',status:'completed',conclusion:'success'}),fetchCloudflareDeployment:async()=>({id:m.deployment_id,versions:[{version_id:m.worker_version_id,percentage:100}]}),fetchArtifactBytes:async()=>({version_id:m.worker_version_id,bytes})};
test('correlates matching evidence without declaring verified provenance or release approval',async()=>{
 assert.deepEqual(await checkDeploymentEvidence(m,providers),{providerMatches:true,digestMatches:true,evidenceCorrelated:true,provenanceVerified:false,releaseAuthorized:false});
});
test('rejects wrong deployment version, modified artifact and unavailable provider',async()=>{
 for(const artifact of [{version_id:'other',bytes},{version_id:m.worker_version_id,bytes:Buffer.from('modified')},null]){
  const v=await checkDeploymentEvidence(m,{...providers,fetchArtifactBytes:async()=>artifact});
  assert.equal(v.evidenceCorrelated,false);
 }
 assert.equal((await checkDeploymentEvidence(m,{...providers,fetchCloudflareDeployment:async()=>{throw Error('offline')}})).evidenceCorrelated,false);
});
