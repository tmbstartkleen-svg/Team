import test from 'node:test';
import assert from 'node:assert/strict';
import {validateJournalStagingConfiguration,validateJournalStagingIdentity} from '../lib/workflow-journal-staging-preflight.mjs';
const base={ATLAS_JOURNAL_STAGING_TEST:'I_AUTHORIZE_STAGING_WRITES',ATLAS_JOURNAL_STAGING_EXPECTED_DATABASE:'atlas_staging_journal',ATLAS_JOURNAL_STAGING_DATABASE_URL:'postgresql://staging_user:secret@localhost:5432/atlas_staging_journal'};
test('accepts explicitly scoped staging config without any connection',()=>assert.deepEqual(validateJournalStagingConfiguration(base),{ok:true,expectedDatabase:'atlas_staging_journal'}));
for(const [name,changes] of Object.entries({
 'no opt-in':{ATLAS_JOURNAL_STAGING_TEST:''},
 'production name':{ATLAS_JOURNAL_STAGING_EXPECTED_DATABASE:'atlas_production_staging'},
 'no staging name':{ATLAS_JOURNAL_STAGING_EXPECTED_DATABASE:'atlas_test'},
 'mismatched URL':{ATLAS_JOURNAL_STAGING_DATABASE_URL:'postgresql://u:p@localhost/another_database'},
 'production host':{ATLAS_JOURNAL_STAGING_DATABASE_URL:'postgresql://u:p@production.example.com/atlas_staging_journal'},
 'non-postgres URL':{ATLAS_JOURNAL_STAGING_DATABASE_URL:'https://u:p@localhost/atlas_staging_journal'},
 'remote TLS disabled':{ATLAS_JOURNAL_STAGING_DATABASE_URL:'postgresql://u:p@staging.example.com/atlas_staging_journal?sslmode=disable'},
 'connection override':{ATLAS_JOURNAL_STAGING_DATABASE_URL:'postgresql://u:p@localhost/atlas_staging_journal?options=-c'},
 'missing URL':{ATLAS_JOURNAL_STAGING_DATABASE_URL:''}
}))test('fails closed: '+name,()=>assert.equal(validateJournalStagingConfiguration({...base,...changes}).ok,false));
test('verified database identity required',()=>{
 assert.equal(validateJournalStagingIdentity({database_name:'atlas_staging_journal',role_name:'test_role'},'atlas_staging_journal'),true);
 assert.throws(()=>validateJournalStagingIdentity({database_name:'atlas_production',role_name:'x'},'atlas_staging_journal'));
 assert.throws(()=>validateJournalStagingIdentity({database_name:'atlas_staging_journal',role_name:''},'atlas_staging_journal'));
});
