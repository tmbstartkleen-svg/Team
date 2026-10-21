import test from 'node:test';
import assert from 'node:assert/strict';
import {buildTrustedReleaseSources} from '../lib/trusted-release-source-config.mjs';
const commit='a'.repeat(40),fetchImpl=async()=>({ok:false}),now='2026-10-21T12:00:00Z';
const env={TEAM_RELEASE_EVIDENCE_READ_ENABLED:'true',TEAM_DEPLOYMENT_COMMIT:commit,TEAM_GITHUB_EVIDENCE_TOKEN:'test-token'};
test('source configuration disabled unless separately opted in',()=>{
 assert.deepEqual(buildTrustedReleaseSources({...env,TEAM_RELEASE_EVIDENCE_READ_ENABLED:'false'},{fetchImpl,now}),{});
 assert.deepEqual(buildTrustedReleaseSources({...env,TEAM_GITHUB_EVIDENCE_TOKEN:''},{fetchImpl,now}),{});
 assert.deepEqual(buildTrustedReleaseSources({...env,TEAM_DEPLOYMENT_COMMIT:'unknown'},{fetchImpl,now}),{});
 assert.deepEqual(buildTrustedReleaseSources(env,{now}),{});
});
test('enabled composition allows only read-only GitHub CI evidence, never owner approvals',async()=>{
 const sources=buildTrustedReleaseSources(env,{fetchImpl,now});
 assert.equal(sources.deploymentCommit,commit);
 assert.deepEqual(Object.keys(sources.verifiers),['github-actions']);
 assert.equal((await sources.verifiers['github-actions']({requirement:'owner-signoff'})).verified,false);
 assert.equal(Object.isFrozen(sources.verifiers),true);
});
