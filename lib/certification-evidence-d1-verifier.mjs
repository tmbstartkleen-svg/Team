import {validateCertificationEvidence} from './certification-evidence-contract.mjs';

// Read-only, parameterized cross-check against the durable D1 task/approval/receipt record.
// This is NOT a cryptographic issuer attestation, nor authorization to activate agents.
export async function verifyCertificationEvidenceAgainstD1(db,record,context={},now=Date.now()){
 const fail=(reason)=>({ok:false,reason,readinessGranted:false});
 const structural=validateCertificationEvidence(record,context,now);
 if(!structural.ok)return fail(structural.reason);
 if(!db?.prepare)return fail('database_not_bound');
 // This phase can independently corroborate approved task execution, but cannot
 // infer AI model authenticity, persona identity, recovery or end-to-end coverage.
 if(record.gate!=='approved-agent-execution')return fail('gate_provenance_not_supported');
 try{
  const task=await db.prepare("SELECT state,owner_approved,attempt_count,completion_evidence FROM team_tasks WHERE id=?").bind(record.taskId).first();
  if(!task||task.state!=='verified'||task.owner_approved!==1||!Number.isSafeInteger(task.attempt_count)||task.attempt_count<1||
     typeof task.completion_evidence!=='string'||task.completion_evidence.length<8)return fail('task_not_verified');
  const approval=await db.prepare("SELECT id,actor,decision FROM team_approval_audit WHERE id=? AND task_id=?").bind(record.ownerDecisionId,record.taskId).first();
  if(!approval||approval.actor!=='owner'||approval.decision!=='approved')return fail('owner_approval_not_verified');
  const ids=record.receiptIds;
  const marks=ids.map(()=>'?').join(',');
  const rows=await db.prepare("SELECT id,task_id,attempt_count,outcome,evidence FROM team_execution_receipts WHERE task_id=? AND id IN ("+marks+")").bind(record.taskId,...ids).all();
  const receipts=rows?.results;
  if(!Array.isArray(receipts)||receipts.length!==ids.length||
     receipts.some(x=>x.task_id!==record.taskId||x.outcome!=='verified'||x.attempt_count!==task.attempt_count||
       x.evidence!==task.completion_evidence)||new Set(receipts.map(x=>x.id)).size!==ids.length)return fail('receipt_provenance_not_verified');
  return {ok:true,reason:null,independentlyCorroborated:true,readinessGranted:false,
   requiresIndependentIssuerAndReleaseVerification:true};
 }catch{return fail('database_verification_failed')}
}
