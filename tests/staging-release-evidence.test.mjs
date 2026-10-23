import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateStagingRelease} from '../lib/staging-release-evidence.mjs';
const health = {
 environment:'preview', productionOperational:false, releaseCommit:'abcd0123abcd',
 configuration:{operatorSecretPresent:true},
 stagingDatabase:{enabled:true,connected:true,schemaReady:true,tables:{projects:true,tasks:true,events:true}},
 capabilities:{modelExecution:'disabled'}, executionConfigured:false
};
const evidence = {ok:true,environment:'preview',taskId:'11111111-1111-4111-8111-111111111111',taskStatus:'queued',approval:'rejected',
 duplicateDecisionStatus:409,modelExecution:'not called',productionTouched:false,
 auditEvents:['task.created','task.rejected']};
test('healthy preview without live persistence proof is not certified', () => {
 const result=evaluateStagingRelease(health);
 assert.equal(result.previewHealthReady,true);
 assert.equal(result.liveWorkflowVerified,false);
 assert.equal(result.ok,false);
 assert.equal(result.classification,'STAGING_EVIDENCE_INCOMPLETE');
});
test('complete synthetic reject and audit proof passes staging evidence gate', () => {
 const result=evaluateStagingRelease(health,evidence);
 assert.equal(result.ok,true);
 assert.equal(result.checks.length,8);
});
test('production or model execution cannot pass staging evidence', () => {
 for(const h of [{...health,environment:'production'},{...health,productionOperational:true},
  {...health,capabilities:{modelExecution:'configured-not-verified'}},
  {...health,stagingDatabase:{...health.stagingDatabase,connected:false}},
  {...health,configuration:{operatorSecretPresent:false}}]){
  assert.equal(evaluateStagingRelease(h,evidence).ok,false);
 }
});
test('missing audit event or rejected task evidence fails closed', () => {
 for(const e of [{...evidence,auditEvents:['task.created']},{...evidence,approval:'approved'},
  {...evidence,duplicateDecisionStatus:200},{...evidence,modelExecution:'called'},
  {...evidence,productionTouched:true},{...evidence,taskStatus:'running'},
  {...evidence,taskId:'not-a-task-id'},{...evidence,auditEvents:['task.created','task.created','task.rejected']}]){
  assert.equal(evaluateStagingRelease(health,e).ok,false);
 }
});
