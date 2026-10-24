import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProductionSignedAttestationReader} from '../lib/production-signed-attestation-source.mjs';
const proof={requirement:'real-read-adapter',taskId:'safe-cert-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123',receiptId:'safe-receipt-123'};
const now='2026-10-22T12:00:00Z';
test('unset and malformed operator settings cannot inspect or certify',async()=>{
 const db={prepare(){throw Error('should never query')}};
 for(const env of [{},{TEAM_SIGNED_ATTESTATION_READ_ENABLED:'true',TEAM_DB:db},
  {TEAM_SIGNED_ATTESTATION_READ_ENABLED:'true',TEAM_DB:db,TEAM_DEPLOYMENT_COMMIT:'a'.repeat(40),
   TEAM_AUDIT_SIGNER_ISSUER:'audit-issuer-123',TEAM_AUDIT_SIGNER_PUBLIC_KEY:'invalid'}]){
  assert.deepEqual(await buildProductionSignedAttestationReader(env,{now})(proof),{verified:false});
 }
});
test('even fully configured source never certifies on D1 outage',async()=>{
 const db={prepare(){throw Error('unavailable')}};
 const env={TEAM_SIGNED_ATTESTATION_READ_ENABLED:'true',TEAM_DB:db,
  TEAM_DEPLOYMENT_COMMIT:'a'.repeat(40),TEAM_AUDIT_SIGNER_ISSUER:'audit-issuer-123',
  TEAM_AUDIT_SIGNER_PUBLIC_KEY:'A'.repeat(43)};
 assert.deepEqual(await buildProductionSignedAttestationReader(env,{now})(proof),{verified:false});
});
test('protected task IDs remain excluded when source configuration is present',async()=>{
 const env={TEAM_SIGNED_ATTESTATION_READ_ENABLED:'true',TEAM_DB:{prepare(){throw Error('must not query')}},
  TEAM_DEPLOYMENT_COMMIT:'a'.repeat(40),TEAM_AUDIT_SIGNER_ISSUER:'audit-issuer-123',
  TEAM_AUDIT_SIGNER_PUBLIC_KEY:'A'.repeat(43)};
 for(const taskId of ['cert-github-read-20261018','cert-github-read-20261019-v2'])
  assert.deepEqual(await buildProductionSignedAttestationReader(env,{now})( {...proof,taskId}),{verified:false});
});
