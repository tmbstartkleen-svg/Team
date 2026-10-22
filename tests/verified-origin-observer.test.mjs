import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {canonicalSignedAuditPayload} from '../lib/signed-audit-canonical.mjs';
import {createVerifiedOriginObserver} from '../lib/verified-origin-observer.mjs';
const issuer='separate-source-issuer',now='2026-10-22T12:00:00Z';
const scope={kind:'owner-authenticated-approval',taskId:'safe-task-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123'};
const b64=b=>Buffer.from(b).toString('base64url');
test('independently signed source confirms owner provenance; changed flags fail',async()=>{
 const pair=await webcrypto.subtle.generateKey('Ed25519',true,['sign','verify']);
 const publicKey=b64(await webcrypto.subtle.exportKey('raw',pair.publicKey));
 const event={...scope,eventId:'origin-event-123',sourceId:'origin-source-123',sourceEventAt:now,
  ownerPrincipal:'owner-person-123',approved:true,ownerAuthenticated:true,approvedBeforeExecution:true};
 const signature=b64(await webcrypto.subtle.sign('Ed25519',pair.privateKey,canonicalSignedAuditPayload(issuer,event)));
 const reader=createVerifiedOriginObserver({issuer,publicKey,sourceId:'origin-source-123',now,cryptoImpl:webcrypto,readOrigin:async()=>({issuer,event,signature})});
 assert.equal((await reader(scope)).originAuthenticated,true);
 const forged=createVerifiedOriginObserver({issuer,publicKey,sourceId:'origin-source-123',now,cryptoImpl:webcrypto,readOrigin:async()=>({issuer,event:{...event,ownerPrincipal:'different-owner'},signature})});
 assert.equal(await forged(scope),null);
 const old=createVerifiedOriginObserver({issuer,publicKey,now:'2026-10-23T12:00:00Z',cryptoImpl:webcrypto,readOrigin:async()=>({issuer,event,signature})});
 assert.equal(await old(scope),null);
});
test('missing pinned credentials and protected tasks fail closed',async()=>{
 assert.equal(await createVerifiedOriginObserver({})(scope),null);
 const reader=createVerifiedOriginObserver({issuer,sourceId:'origin-source-123',publicKey:'A'.repeat(43),now,cryptoImpl:webcrypto,readOrigin:async()=>{throw Error('no source')}});
 assert.equal(await reader({...scope,taskId:'cert-github-read-20261019-v2'}),null);
});
