import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateTrustedReleaseEvidence} from '../lib/trusted-release-evidence-verifier.mjs';
import {assessTeamRelease} from '../lib/team-release-certification.mjs';
const commit='b'.repeat(40),digest='a'.repeat(64),now='2026-10-21T12:00:00Z';
const event=(id='evidence-0001',overrides={})=>({id,requirement_key:'ci',issuer:'github-actions',source_family:'github-actions',artifact_ref:'https://github.com/org/repo/actions/runs/123',artifact_sha256:digest,deployment_commit:commit,environment:'production',verification_method:'api-digest-verified',verdict:'verified',event_time:now,...overrides});
const verify=async()=>({verified:true,issuer:'github-actions',artifactDigest:digest});
const run=(events,verifiers={'github-actions':verify},more={})=>evaluateTrustedReleaseEvidence({events,deploymentCommit:commit,environment:'production',now,verifiers,...more});
test('verified source must match issuer and digest',async()=>{
 assert.equal((await run([event()])).ci?.verified,true);
 assert.equal((await run([event()],{'github-actions':async()=>({verified:true,issuer:'fake',artifactDigest:digest})})).ci,undefined);
 assert.equal((await run([event()],{'github-actions':async()=>({verified:true,issuer:'github-actions',artifactDigest:'b'.repeat(64)})})).ci,undefined);
});
test('untrusted or missing verifier cannot certify',async()=>{
 assert.deepEqual(await run([event()],{}),{});
 assert.deepEqual(await run([event('evidence-0002',{source_family:'unknown-source'})]),{});
 assert.deepEqual(await run([event('evidence-0003',{requirement_key:'persona-e2e'})]),{});
});
test('forged, old, future, wrong commit, and wrong environment evidence is rejected',async()=>{
 const invalid=[
  event('bad-commit',{deployment_commit:'c'.repeat(40)}),
  event('bad-environment',{environment:'staging'}),
  event('bad-digest',{artifact_sha256:'bad'}),
  event('future-dated',{event_time:'2026-10-22T12:00:00Z'}),
  event('too-old',{event_time:'2026-10-18T12:00:00Z'})
 ];
 assert.deepEqual(await run(invalid),{});
});
test('revoked evidence, duplicate ids, and source outage block release',async()=>{
 assert.deepEqual(await run([event(),event('revocation-001',{verdict:'revoked',supersedes_event_id:'evidence-0001'})]),{});
 assert.deepEqual(await run([event(),event('evidence-0001')]),{});
 assert.deepEqual(await run([event()],{'github-actions':async()=>{throw Error('outage')}}),{});
});
test('no arbitrary source proof can activate release',async()=>{
 const proof=await run([event()]);
 const evaluation=assessTeamRelease(proof);
 assert.equal(evaluation.launchReady,false);
 assert.equal(evaluation.missing.includes('real-read-adapter'),true);
});

test('malformed revocation cannot silently restore verified evidence',async()=>{
 const broken=event('revocation-001',{verdict:'revoked',supersedes_event_id:'evidence-0001',artifact_sha256:'bad'});
 assert.deepEqual(await run([event(),broken]),{});
});

test('orphaned revocation blocks all certification rather than disappearing',async()=>{
 const orphan=event('revocation-999',{verdict:'revoked',supersedes_event_id:'missing-source'});
 assert.deepEqual(await run([event(),orphan]),{});
});

test('unknown verdict and malformed rejected supersession fail closed even beside valid CI',async()=>{
 assert.deepEqual(await run([event(),event('unknown-verdict',{verdict:'accepted'})]),{});
 assert.deepEqual(await run([event(),event('rejection-01',{verdict:'rejected',supersedes_event_id:'missing-proof'})]),{});
 assert.deepEqual(await run([event(),event('rejection-02',{verdict:'rejected',supersedes_event_id:'bad id'})]),{});
});
