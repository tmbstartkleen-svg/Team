import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeSpecialistLearning,evaluateLearningPromotion,chooseSpecialistModel} from '../lib/specialist-learning-policy.mjs';
const item={specialistId:'mba',id:'correction-1',type:'owner-correction',
 summary:'Prefer business reports with explicit financial assumptions',evidenceRef:'owner-note-1'};
test('learning requires owner consent and valid evidence',()=>{
 assert.equal(proposeSpecialistLearning(item).ok,false);
 assert.equal(proposeSpecialistLearning(item,{consent:true}).state,'proposed');
 assert.equal(proposeSpecialistLearning({...item,containsCredentials:true},{consent:true}).ok,false);
 assert.equal(proposeSpecialistLearning({...item,specialistId:'ghost'},{consent:true}).ok,false);
});
test('learning never auto-promotes without evidence, evaluations and owner approval',()=>{
 const proposal=proposeSpecialistLearning(item,{consent:true});
 const args={proposal,evaluation:{passed:true,testsRun:5,regressions:0},baseVersion:'v1',nextVersion:'v2'};
 assert.equal(evaluateLearningPromotion(args).allowed,false);
 assert.equal(evaluateLearningPromotion({...args,ownerApproved:true,evaluation:{passed:false,testsRun:5,regressions:0}}).allowed,false);
 assert.equal(evaluateLearningPromotion({...args,ownerApproved:true,evaluation:{passed:true,testsRun:5,regressions:1}}).allowed,false);
 const result=evaluateLearningPromotion({...args,ownerApproved:true});
 assert.equal(result.allowed,true);assert.equal(result.writesPerformed,false);
});
test('model choice refuses invented frontier or offline models',()=>{
 assert.equal(chooseSpecialistModel({offline:true}).available,false);
 assert.equal(chooseSpecialistModel({online:true,connectedModels:['frontier-v9'],allowedModels:[]}).available,false);
 const online=chooseSpecialistModel({online:true,connectedModels:['model-live'],allowedModels:['model-live'],preferredModel:'fake-better'});
 assert.equal(online.model,'model-live');
 const local=chooseSpecialistModel({offline:true,installedLocalModels:['model-local'],allowedModels:['model-local'],ownerApprovedModel:'model-local'});
 assert.equal(local.mode,'offline');assert.equal(local.claimsOfFrontierParity,false);
});
