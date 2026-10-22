import test from 'node:test';
import assert from 'node:assert/strict';
import {createProductionEvidencePreflight} from '../lib/production-evidence-preflight.mjs';
const proof={requirement:'real-read-adapter',taskId:'safe-task-100',stepId:'safe-step-100',idempotencyKey:'safe-key-100',receiptId:'safe-receipt-100'};
test('diagnostics are disabled without operator enablement',async()=>{
 const preflight=createProductionEvidencePreflight({});
 assert.deepEqual(await preflight(proof),{ready:false,verified:false,reason:'source_disabled'});
});
test('missing D1 cannot be mistaken for certification',async()=>{
 const preflight=createProductionEvidencePreflight({TEAM_SIGNED_ATTESTATION_READ_ENABLED:'true'});
 assert.deepEqual(await preflight(proof),{ready:false,verified:false,reason:'database_unavailable'});
});
test('even operator-enabled test fixture remains uncertified without authenticated signed events',async()=>{
 const env={TEAM_SIGNED_ATTESTATION_READ_ENABLED:'true',TEAM_DB:{prepare(){throw Error('outage')}},
 TEAM_DEPLOYMENT_COMMIT:'a'.repeat(40),TEAM_AUDIT_SIGNER_ISSUER:'audit-signer-100',TEAM_AUDIT_SIGNER_PUBLIC_KEY:'A'.repeat(43)};
 const result=await createProductionEvidencePreflight(env,{now:'2026-10-22T12:00:00Z'})(proof);
 assert.deepEqual(result,{ready:false,verified:false,reason:'not_independently_certified'});
});
