// A structural contract only: well-formed evidence is NOT independently trusted proof.
// No caller may grant launch readiness directly from this result.
const GATES=new Set(['live-inference-certified','persona-identity','approved-agent-execution','persistent-task-recovery','end-to-end-certification']);
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const SHA=/^[a-f0-9]{40}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const REVOKED=new Set(['revoked','expired','failed']);
const isIso=(s)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(s)&&Number.isFinite(Date.parse(s));
export function validateCertificationEvidence(record,context={},now=Date.now()){
 const fail=(reason)=>({ok:false,reason,readinessGranted:false});
 if(!record||typeof record!=='object'||Array.isArray(record))return fail('invalid_record');
 if(record.version!==1||!GATES.has(record.gate))return fail('unsupported_evidence');
 if(!ID.test(record.id||'')||!ID.test(record.taskId||''))return fail('invalid_identity');
 if(record.environment!=='staging'||context.environment!=='staging')return fail('environment_not_staging');
 if(!SHA.test(record.sourceCommit||'')||record.sourceCommit!==context.sourceCommit)return fail('source_commit_mismatch');
 if(!UUID.test(record.databaseId||'')||record.databaseId!==context.databaseId)return fail('database_mismatch');
 if(!UUID.test(record.deploymentId||'')||record.deploymentId!==context.deploymentId)return fail('deployment_mismatch');
 if(!isIso(record.observedAt)||!isIso(record.expiresAt)||!Number.isFinite(now))return fail('invalid_timestamp');
 const start=Date.parse(record.observedAt),end=Date.parse(record.expiresAt);
 if(start>now||end<=now||end<=start||end-start>24*60*60*1000)return fail('stale_or_excessive_lifetime');
 if(record.status!=='observed'||REVOKED.has(record.status))return fail('not_observed');
 if(!Array.isArray(record.receiptIds)||record.receiptIds.length<1||record.receiptIds.length>16||record.receiptIds.some(x=>!ID.test(x||''))||new Set(record.receiptIds).size!==record.receiptIds.length)return fail('invalid_receipts');
 if(!ID.test(record.ownerDecisionId||'')||!ID.test(record.issuerId||''))return fail('missing_authorization_references');
 if(record.taskId==='cert-github-read-20261019-v2'||record.taskId==='cert-github-read-20261018')return fail('protected_task_forbidden');
 return {ok:true,reason:null,readinessGranted:false,requiresIndependentVerification:true};
}
