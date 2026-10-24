// Read-only evidence classifier for ATLAS journal staging certification.
// A skipped test, green CI, or caller-supplied assertion is never live database evidence.
const REQUIRED=['concurrent_create','concurrent_update','transaction_rollback','fresh_connection_recovery','idempotent_replay','conflict_immutability','cleanup'];
export function assessJournalStagingEvidence(input={}){
 const failures=[];
 if(input.environment!=='isolated-staging')failures.push('environment_unverified');
 if(typeof input.commit!=='string'||!/^[a-f0-9]{40}$/.test(input.commit))failures.push('invalid_commit');
 if(input.testRunStatus!=='passed'||input.liveTestExecuted!==true)failures.push('live_test_not_proven');
 if(input.independentReviewerApproved!==true)failures.push('review_required');
 if(typeof input.databaseName!=='string'||!input.databaseName.includes('staging')||/prod|live|primary/i.test(input.databaseName))failures.push('database_identity_unverified');
 if(!input.isolatedCredentialsVerified)failures.push('credential_isolation_unverified');
 for(const key of REQUIRED)if(input.results?.[key]!=='passed')failures.push('missing_'+key);
 return Object.freeze({certified:failures.length===0,failures,requirements:REQUIRED});
}
