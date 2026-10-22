import test from 'node:test';
import assert from 'node:assert/strict';
import {createSignedExecutionAttestationReader} from '../lib/signed-execution-attestation-reader.mjs';
const proof={requirement:'real-read-adapter',taskId:'safe-task-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123',receiptId:'safe-receipt-123'};
test('combined attestation fails closed without signed provenance source',async()=>{
 const db={prepare(){throw Error('not connected')}};
 const verify=createSignedExecutionAttestationReader({db});
 assert.deepEqual(await verify(proof),{verified:false});
});
test('caller-provided unverified records never turn into provenance',async()=>{
 const db={prepare(){throw Error('no DB')}};
 const verify=createSignedExecutionAttestationReader({db,readEvent:async()=>({sourceVerified:true,approved:true,denied:true})});
 assert.deepEqual(await verify(proof),{verified:false});
});
test('historical protected tasks remain excluded from combined attestation',async()=>{
 const verify=createSignedExecutionAttestationReader({db:{prepare(){throw Error('offline')}}});
 for(const taskId of ['cert-github-read-20261018','cert-github-read-20261019-v2'])
  assert.deepEqual(await verify({...proof,taskId}),{verified:false});
});
