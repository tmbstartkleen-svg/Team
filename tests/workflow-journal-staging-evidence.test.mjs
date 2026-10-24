import test from 'node:test';
import assert from 'node:assert/strict';
import {assessJournalStagingEvidence} from '../lib/workflow-journal-staging-evidence.mjs';
const results=Object.fromEntries(['concurrent_create','concurrent_update','transaction_rollback','fresh_connection_recovery','idempotent_replay','conflict_immutability','cleanup'].map(k=>[k,'passed']));
const valid={environment:'isolated-staging',commit:'a'.repeat(40),testRunStatus:'passed',liveTestExecuted:true,independentReviewerApproved:true,databaseName:'atlas_staging_journal',isolatedCredentialsVerified:true,results};
test('evidence checklist can classify complete independently reviewed staging evidence',()=>assert.equal(assessJournalStagingEvidence(valid).certified,true));
for(const [name,payload] of Object.entries({
 'green CI without live test':{liveTestExecuted:false},
 'skipped live test':{testRunStatus:'skipped'},
 'missing reviewer':{independentReviewerApproved:false},
 'production database':{databaseName:'atlas_production'},
 'unverified credentials':{isolatedCredentialsVerified:false},
 'failed rollback':{results:{...results,transaction_rollback:'failed'}},
 'missing cleanup':{results:{...results,cleanup:undefined}},
 'missing commit':{commit:''}
}))test('evidence assessment blocks '+name,()=>assert.equal(assessJournalStagingEvidence({...valid,...payload}).certified,false));
test('default evidence is never certified',()=>assert.equal(assessJournalStagingEvidence().certified,false));
