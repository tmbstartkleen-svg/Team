import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeReleaseEvidence,handleReleaseEvidenceDashboard} from '../lib/release-evidence-dashboard.mjs';
import {RELEASE_EVIDENCE_REQUIREMENTS} from '../lib/team-release-certification.mjs';
const blocked={ok:true,checks:[{id:'database-binding',required:true,ready:true},{id:'approved-agent-execution',required:true,ready:false}],productionOperational:false,agentsActive:false,betaReady:false};
test('five milestones remain blocked with no receipts',()=>{
 const x=summarizeReleaseEvidence({launch:blocked});
 assert.equal(x.remainingMilestones,5);assert.equal(x.launchAuthorized,false);
 assert.equal(x.releaseEvidence.required,13);
 assert.deepEqual(x.requiredGatesOpen,['approved-agent-execution']);
 assert.ok(x.certificationMilestones.every(m=>!m.certified));
});
test('green configuration cannot impersonate release authorization',()=>{
 const evidence=Object.fromEntries(RELEASE_EVIDENCE_REQUIREMENTS.map(k=>[k,{verified:true,reference:'immutable-proof-id'}]));
 const x=summarizeReleaseEvidence({launch:blocked,releaseEvidence:evidence});
 assert.equal(x.remainingMilestones,0);
 assert.equal(x.launchAuthorized,false);
 assert.equal(x.certificationStatus,'blocked');
});
test('incomplete proof reference does not complete milestone',()=>{
 const x=summarizeReleaseEvidence({launch:blocked,releaseEvidence:{'owner-signoff':{verified:true,reference:''}}});
 assert.equal(x.certificationMilestones.at(-1).certified,false);
});
test('public GET is read-only and never accepts submitted approval',async()=>{
 const r=await handleReleaseEvidenceDashboard(new Request('https://example.test/api/release-evidence-dashboard'),{});
 assert.equal(r.status,200);const x=await r.json();
 assert.equal(x.readOnly,true);assert.equal(x.launchAuthorized,false);
 assert.equal(x.safety.ownerApprovalRequired,true);
 assert.equal(x.remainingMilestones,5);
 assert.equal(JSON.stringify(x).includes('immutable-proof-id'),false);
});
test('POST rejected without invoking persistence',async()=>{
 let touched=false;
 const r=await handleReleaseEvidenceDashboard(new Request('https://example.test/api/release-evidence-dashboard',{method:'POST'}),{TEAM_DB:{prepare(){touched=true;throw Error('must not touch')}}});
 assert.equal(r.status,405);assert.equal(touched,false);
});
test('invalid source snapshots fail closed',()=>{
 assert.throws(()=>summarizeReleaseEvidence({launch:{ok:false,checks:[]}}),/invalid_launch_snapshot/);
 assert.throws(()=>summarizeReleaseEvidence({launch:{...blocked,checks:[{id:'BAD VALUE',required:true,ready:true}]}}),/invalid_gate_id/);
});

test('every release requirement is assigned to a visible milestone',()=>{
 const x=summarizeReleaseEvidence({launch:blocked});
 const keys=new Set(x.certificationMilestones.flatMap(m=>m.missingEvidence));
 assert.deepEqual([...keys].sort(),[...RELEASE_EVIDENCE_REQUIREMENTS].sort());
});
test('missing CI, main merge or deployed worker keeps reliability milestone open',()=>{
 const evidence=Object.fromEntries(RELEASE_EVIDENCE_REQUIREMENTS.map(k=>[k,{verified:true,reference:'immutable-proof-id'}]));
 for(const key of ['ci','merged-main','deployed-worker']){
  const e={...evidence,[key]:{verified:false,reference:''}};
  const x=summarizeReleaseEvidence({launch:blocked,releaseEvidence:e});
  assert.equal(x.certificationMilestones.find(m=>m.id==='production-reliability').certified,false);
  assert.ok(x.releaseEvidence.missing.includes(key));
 }
});

test('missing evidence and readiness gates are explicitly described',()=>{
 const x=summarizeReleaseEvidence({launch:blocked});
 assert.equal(x.outstandingEvidenceCount,RELEASE_EVIDENCE_REQUIREMENTS.length);
 assert.deepEqual(x.requiredGateStatus,[{id:'database-binding',status:'ready'},{id:'approved-agent-execution',status:'blocked'}]);
 assert.ok(x.certificationMilestones.every(m=>m.evidenceStatus==='unverified'));
 assert.equal(x.launchAuthorized,false);
});
test('evidence metadata cannot change runtime readiness gate statuses',()=>{
 const evidence=Object.fromEntries(RELEASE_EVIDENCE_REQUIREMENTS.map(k=>[k,{verified:true,reference:'immutable-proof-id'}]));
 const x=summarizeReleaseEvidence({launch:blocked,releaseEvidence:evidence});
 assert.equal(x.outstandingEvidenceCount,0);
 assert.ok(x.certificationMilestones.every(m=>m.evidenceStatus==='verified'));
 assert.equal(x.requiredGateStatus.find(g=>g.id==='approved-agent-execution').status,'blocked');
 assert.equal(x.launchAuthorized,false);
});
