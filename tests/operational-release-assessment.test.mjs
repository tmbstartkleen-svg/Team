import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAtlasReadiness} from '../lib/operational-release-assessment.mjs';
const health={environment:'preview',productionOperational:false,releaseCommit:'ae8e51878898',
 stagingDatabase:{connected:true,schemaReady:true},executionConfigured:false,
 capabilities:{modelExecution:'disabled',autonomousAgents:false},
 edge:{certified:false},releaseChecks:{liveWorkflowVerified:false,minimumConfigurationPresent:false}};
test('healthy Preview remains operationally blocked when capabilities and release evidence are incomplete',()=>{
 const r=assessAtlasReadiness(health);
 assert.equal(r.previewHealthReady,true);assert.equal(r.productionLaunchReady,false);
 assert.equal(r.productionApprovalGranted,false);assert.ok(r.blockers.includes('live_workflow_evidence_not_attached'));
 assert.ok(r.blockers.includes('autonomous_agents_not_operational'));
});
test('unsafe environment or execution must fail Preview readiness',()=>{
 for(const altered of [{...health,environment:'production'},{...health,productionOperational:true},
  {...health,capabilities:{...health.capabilities,modelExecution:'configured-not-verified'}},
  {...health,stagingDatabase:{connected:false,schemaReady:true}}]){
  assert.equal(assessAtlasReadiness(altered).previewHealthReady,false);
 }
});
test('even apparently complete configuration cannot grant production approval',()=>{
 const r=assessAtlasReadiness({...health,releaseChecks:{liveWorkflowVerified:true,minimumConfigurationPresent:true},
 edge:{certified:true},capabilities:{...health.capabilities,autonomousAgents:true}});
 assert.equal(r.productionLaunchReady,false);assert.equal(r.productionApprovalGranted,false);
});
