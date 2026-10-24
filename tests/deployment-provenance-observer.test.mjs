import test from 'node:test';
import assert from 'node:assert/strict';
import {observeDeploymentProvenance} from '../lib/deployment-provenance-observer.mjs';
const commit='a'.repeat(40);
const m={schema_version:1,repository:'tmbstartkleen-svg/Team',source_ref:'refs/heads/main',source_commit:commit,artifact_sha256:'b'.repeat(64),worker_name:'atlas-team',environment:'production',worker_version_id:'04c3bdb1-d07e-4893-98a1-2eaccd6614a1',deployment_id:'6d8e6f82-f1f0-4ba8-a8b7-38e1c383b155',deployed_percentage:100,github_workflow_run_id:123,github_workflow_run_attempt:1,github_workflow_url:'https://github.com/tmbstartkleen-svg/Team/actions/runs/123',deployment_observed_at:'2026-10-21T18:35:42Z'};
const run={id:123,run_attempt:1,repository:{full_name:m.repository},head_sha:commit,head_branch:'main',event:'push',status:'completed',conclusion:'success'};
const deployment={id:m.deployment_id,versions:[{version_id:m.worker_version_id,percentage:100}]};
const check=(a=run,b=deployment)=>observeDeploymentProvenance(m,{fetchGithubRun:async()=>a,fetchCloudflareDeployment:async()=>b});
test('provider IDs matching never substitute for cryptographic provenance and owner approval',async()=>{
 assert.deepEqual(await check(),{providerMatches:true,provenanceVerified:false,releaseAuthorized:false});
});
test('mismatched independent provider metadata fails closed',async()=>{
 for(const altered of [{head_sha:'c'.repeat(40)},{head_branch:'feature'},{conclusion:'failure'},{run_attempt:2},{event:'pull_request'}])
  assert.equal((await check({...run,...altered})).providerMatches,false);
 for(const altered of [{id:'other'},{versions:[{version_id:m.worker_version_id,percentage:50}]},{versions:[]}])
  assert.equal((await check(run,{...deployment,...altered})).providerMatches,false);
});
test('unavailable providers and malformed manifest fail closed',async()=>{
 assert.equal((await observeDeploymentProvenance(m,{fetchGithubRun:async()=>{throw Error('offline')},fetchCloudflareDeployment:async()=>deployment})).providerMatches,false);
 assert.equal((await observeDeploymentProvenance({...m,source_commit:'invalid'},{})).providerMatches,false);
});
