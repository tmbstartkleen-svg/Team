// Task completion is based on recorded effects, never an AI declaration alone.
// This is a reusable policy gate; it does not grant tools, execute work, or persist records.
const RESULT_TYPES = new Set(['analysis','artifact','external-action']);
const PROOF_TYPES = new Set(['analysis-reviewed','artifact-validated','action-confirmed']);
export function evaluateTaskCompletion({resultType, ownerApproved=false, steps=[], blocker=null}={}) {
 if (!RESULT_TYPES.has(resultType) || !Array.isArray(steps) || steps.length>100)
  throw new TypeError('invalid_completion_request');
 if (blocker != null && (typeof blocker!=='string' || !blocker.trim() || blocker.length>500))
  throw new TypeError('invalid_completion_blocker');
 if (blocker) return {complete:false,status:'blocked',reason:'unresolved_blocker'};
 if (!ownerApproved) return {complete:false,status:'awaiting-approval',reason:'owner_approval_required'};
 if (!steps.length) return {complete:false,status:'needs-verification',reason:'missing_steps'};
 for (const step of steps) {
  if (!step || typeof step!=='object' || typeof step.id!=='string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(step.id) ||
      !PROOF_TYPES.has(step.proofType) ||
      typeof step.evidence!=='string' || step.evidence.trim().length<8 ||
      step.evidence.length>2000 || step.verified!==true)
   return {complete:false,status:'needs-verification',reason:'unverified_step'};
  const expected = resultType==='external-action'?'action-confirmed':
   resultType==='artifact'?'artifact-validated':'analysis-reviewed';
  if (step.proofType!==expected)
   return {complete:false,status:'needs-verification',reason:'incorrect_proof_type'};
 }
 if (new Set(steps.map(step=>step.id)).size!==steps.length)
  return {complete:false,status:'needs-verification',reason:'duplicate_step'};
 return {complete:true,status:'verified',reason:'all_steps_verified'};
}
