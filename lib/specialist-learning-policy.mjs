// Local policy only: no live self-training, autonomous model download or background work.
// Improvements are proposed, evaluated, and explicitly promoted by an owner.
import {LAUNCH_SPECIALIST_IDS} from './launch-specialists.mjs';
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const TYPES=new Set(['owner-correction','cited-source','verified-outcome','evaluation-result']);
export function proposeSpecialistLearning(input,{consent=false}={}){
 if(consent!==true)return {ok:false,reason:'owner_consent_required'};
 if(!input||typeof input!=='object'||Array.isArray(input)||
  !LAUNCH_SPECIALIST_IDS.includes(input.specialistId)||
  !TYPES.has(input.type)||!ID.test(input.id||'')||
  typeof input.summary!=='string'||input.summary.trim().length<5||input.summary.length>1000||
  typeof input.evidenceRef!=='string'||!ID.test(input.evidenceRef)||
  input.containsCredentials===true)
  return {ok:false,reason:'invalid_learning_proposal'};
 return {ok:true,state:'proposed',promoted:false,requiresEvaluation:true,
  specialistId:input.specialistId,id:input.id,type:input.type,
  summary:input.summary.trim(),evidenceRef:input.evidenceRef};
}
export function evaluateLearningPromotion({proposal,evaluation,ownerApproved=false,baseVersion,nextVersion}={}){
 if(!proposal?.ok||proposal.state!=='proposed'||proposal.promoted!==false||
  !evaluation||evaluation.passed!==true||!Number.isSafeInteger(evaluation.testsRun)||evaluation.testsRun<1||
  !Number.isSafeInteger(evaluation.regressions)||evaluation.regressions!==0||
  ownerApproved!==true||!ID.test(baseVersion||'')||!ID.test(nextVersion||'')||baseVersion===nextVersion)
  return {allowed:false,reason:'learning_promotion_gate_not_passed'};
 return {allowed:true,reason:'eligible_for_separate_persisted_promotion',writesPerformed:false};
}
export function chooseSpecialistModel({online=false,offline=false,connectedModels=[],allowedModels=[],preferredModel=null,
 installedLocalModels=[],ownerApprovedModel=null}={}){
 const valid=m=>typeof m==='string'&&ID.test(m);
 if(offline){
  const local=installedLocalModels.find(m=>valid(m)&&allowedModels.includes(m)&&m===ownerApprovedModel);
  return local?{available:true,mode:'offline',model:local,claimsOfFrontierParity:false}:
   {available:false,mode:'offline',reason:'no_approved_local_model_installed'};
 }
 if(online){
  const options=[preferredModel,...connectedModels].filter(valid);
  const selected=options.find(m=>connectedModels.includes(m)&&allowedModels.includes(m));
  return selected?{available:true,mode:'online',model:selected,claimsOfFrontierParity:false}:
   {available:false,mode:'online',reason:'no_connected_allowlisted_model'};
 }
 return {available:false,reason:'no_execution_mode_selected'};
}
