// Explicit opt-in staging-only integration test. Never run against production.
// Prerequisite: independently authorized isolated PostgreSQL staging database
// with db/workflow-journal-migration.sql already applied.
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import pg from 'pg';
import {createWorkflowJournalStore} from '../lib/workflow-journal-store.mjs';
import {validateJournalStagingConfiguration,validateJournalStagingIdentity} from '../lib/workflow-journal-staging-preflight.mjs';

const config=validateJournalStagingConfiguration(process.env);
const safe=config.ok;
const url=process.env.ATLAS_JOURNAL_STAGING_DATABASE_URL;
const expectedDb=config.expectedDatabase;
test('real PostgreSQL workflow journal concurrency and rollback (explicit staging opt-in)', {skip: !safe}, async () => {
  const pool = new pg.Pool({connectionString:url, max:4, connectionTimeoutMillis:5000});
  const id=randomBytes(10).toString('hex');
  const store=createWorkflowJournalStore(pool);
  let stagingIdentityVerified=false;
  try {
    // Fail closed before any write if the live database identity differs.
    const identity=await pool.query('SELECT current_database() AS database_name, current_user AS role_name');
    validateJournalStagingIdentity(identity.rows[0],expectedDb);
    stagingIdentityVerified=true;
    // Fail closed if the table has not been provisioned in authorized staging.
    const inventory=await pool.query("SELECT to_regclass('atlas_workflow_journals') AS name");
    assert.ok(inventory.rows[0].name,'isolated staging journal table must already exist');
    const created={type:'workflow.created',idempotencyKey:'create',payload:{title:'staging concurrency probe'}};
    const initial=await Promise.allSettled([
      store.append(id,created,{expectedVersion:0}),
      store.append(id,created,{expectedVersion:0})
    ]);
    assert.equal(initial.filter(x=>x.status==='fulfilled').length,1,'only one initial insert succeeds');
    assert.equal(initial.filter(x=>x.status==='rejected').length,1);
    assert.match(String(initial.find(x=>x.status==='rejected').reason),/workflow_version_conflict/);

    const update1={type:'step.planned',idempotencyKey:'plan-a',payload:{stepId:'first'}};
    const update2={type:'step.planned',idempotencyKey:'plan-b',payload:{stepId:'second'}};
    const updates=await Promise.allSettled([
      store.append(id,update1,{expectedVersion:1}),
      store.append(id,update2,{expectedVersion:1})
    ]);
    assert.equal(updates.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(updates.filter(x=>x.status==='rejected').length,1);
    assert.match(String(updates.find(x=>x.status==='rejected').reason),/workflow_version_conflict/);

    const before=await store.read(id);
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE atlas_workflow_journals SET version=version+1 WHERE workflow_id=$1',[id]);
      await client.query('ROLLBACK');
    } finally {client.release()}
    assert.equal((await store.read(id)).version,before.version,'rolled-back write stays invisible');

    // New connection: committed journal must still be replayable and identical.
    const separate=new pg.Pool({connectionString:url,max:1});
    try {
      const fresh=await createWorkflowJournalStore(separate).read(id);
      assert.equal(fresh.version,before.version);
      assert.deepEqual(fresh.journal,before.journal);
    } finally {await separate.end()}
  } finally {
    // Never issue cleanup writes when the database identity preflight failed.
    if (stagingIdentityVerified) {
      await pool.query('DELETE FROM atlas_workflow_journals WHERE workflow_id=$1',[id]).catch(()=>{});
    }
    await pool.end();
  }
});
