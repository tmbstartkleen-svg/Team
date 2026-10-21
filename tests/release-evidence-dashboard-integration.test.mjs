import test from 'node:test';
import assert from 'node:assert/strict';
import {getReleaseEvidenceDashboard,handleReleaseEvidenceDashboard} from '../lib/release-evidence-dashboard.mjs';
const commit='a'.repeat(40),digest='b'.repeat(64),now='2026-10-21T12:00:00Z';
const ci={id:'evidence-0001',requirement_key:'ci',issuer:'github-actions',source_family:'github-actions',artifact_ref:'https://github.com/example/Team/actions/runs/123',artifact_sha256:digest,environment:'production',deployment_commit:commit,verification_method:'independent-api-check',verdict:'verified',supersedes_event_id:null,event_time:now};
const db=(results)=>({prepare(){return{bind(){return{all:async()=>({results})}}}}}});
const trusted={deploymentCommit:commit,now,verifiers:{'github-actions':async()=>({verified:true,issuer:'github-actions',artifactDigest:digest})}};
test('release dashboard does not accept unsigned evidence from stored rows',async()=>{
 const env={TEAM_DB:db([ci])};
 const result=await getReleaseEvidenceDashboard(env);
 assert.equal(result.launchAuthorized,false);
 assert.equal(result.releaseEvidence.verified,0);
 assert.equal(result.remainingMilestones,5);
});
test('release dashboard read does not enable agents or signoff',async()=>{
 const env={TEAM_DB:db([ci])};
 const result=await getReleaseEvidenceDashboard(env,trusted);
 assert.equal(result.launchAuthorized,false);
 assert.equal(result.productionOperational,false);
 assert.equal(result.releaseEvidence.missing.includes('owner-signoff'),true);
});
test('public route refuses mutations and does not accept caller-supplied trust',async()=>{
 const response=await handleReleaseEvidenceDashboard(new Request('https://atlas.example/release-evidence',{method:'POST'}),{});
 assert.equal(response.status,405);
 const payload=await response.json();
 assert.equal(payload.ok,false);
});
