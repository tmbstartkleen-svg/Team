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
 assert.equal(x.outstandingEvidenceCount,RELEASE_EVIDENCE_REQUIREMENTS.length);
 assert.equal(x.releaseEvidence.verified,0);
 assert.ok(x.certificationMilestones.every(m=>m.evidenceStatus==='unverified'));
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

test('duplicate gate identifiers fail closed rather than hiding conflicting status',()=>{
 assert.throws(()=>summarizeReleaseEvidence({launch:{...blocked,checks:[...blocked.checks,{id:'database-binding',required:true,ready:false}]}}),/invalid_gate_id/);
});

test('unsupported HTTP methods reject before reading database state',async()=>{
 for(const method of ['PUT','PATCH','DELETE']){
  let touched=false;
  const env={TEAM_DB:{prepare(){touched=true;throw Error('unexpected_database_access')}}};
  const result=await handleReleaseEvidenceDashboard(new Request('https://example.test/api/release-evidence-dashboard',{method}),env);
  assert.equal(result.status,405);
  assert.equal(result.headers.get('allow'),'GET');
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal(touched,false);
 }
});
test('read-only response never reveals configured owner credentials',async()=>{
 const secret='S'.repeat(48);
 const result=await handleReleaseEvidenceDashboard(new Request('https://example.test/api/release-evidence-dashboard'),{TEAM_OWNER_API_TOKEN:secret});
 assert.equal(result.status,200);
 const body=await result.text();
 assert.equal(body.includes(secret),false);
 assert.equal(JSON.parse(body).launchAuthorized,false);
});

test('dashboard fails closed with generic error when readiness inspection throws',async()=>{
 const env={};
 Object.defineProperty(env,'TEAM_DB',{get(){throw new Error('private_schema_detail_or_secret')}});
 const result=await handleReleaseEvidenceDashboard(new Request('https://example.test/api/release-evidence-dashboard'),env);
 assert.equal(result.status,503);
 const body=await result.text();
 assert.equal(body.includes('private_schema_detail_or_secret'),false);
 const parsed=JSON.parse(body);
 assert.equal(parsed.productionOperational,false);
 assert.equal(parsed.launchAuthorized,false);
 assert.equal(result.headers.get('cache-control'),'no-store');
});

test('successful GET exposes only non-secret release status fields',async()=>{
 const result=await handleReleaseEvidenceDashboard(new Request('https://example.test/api/release-evidence-dashboard'),{});
 assert.equal(result.status,200);
 assert.equal(result.headers.get('cache-control'),'no-store');
 assert.equal(result.headers.get('x-content-type-options'),'nosniff');
 const body=await result.json();
 assert.equal(body.readOnly,true);
 assert.equal(body.launchAuthorized,false);
 assert.equal(body.productionOperational,false);
 assert.equal(body.safety.generalExecutionNeverEnabledByThisEndpoint,true);
 assert.equal('credentials' in body,false);
 assert.equal('operatorGrants' in body,false);
});

test('query-string approval or production flags cannot authorize the read-only endpoint',async()=>{
 const result=await handleReleaseEvidenceDashboard(new Request('https://example.test/api/release-evidence-dashboard?approved=true&launchAuthorized=true&productionOperational=true&agentsActive=true'),{});
 assert.equal(result.status,200);
 const body=await result.json();
 assert.equal(body.launchAuthorized,false);
 assert.equal(body.productionOperational,false);
 assert.equal(body.certificationStatus,'blocked');
 assert.equal(body.readOnly,true);
});
