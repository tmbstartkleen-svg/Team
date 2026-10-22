import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createSignedProvenanceInspectors} from '../lib/signed-provenance-inspectors.mjs';
const scope={taskId:'safe-task-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123'};
const issuer='atlas-audit-signer',now='2026-10-21T20:00:00Z';
const b64=b=>Buffer.from(b).toString('base64url');
test('signed approval and observed denial verify against pinned public key',async()=>{
 const pair=await webcrypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
 const publicKey=b64(await webcrypto.subtle.exportKey('raw',pair.publicKey));
 const emit=async kind=>{
  const event={...scope,eventId:'audit-event-123',kind,deploymentCommit:'a'.repeat(40),timestamp:now,
   ownerPrincipal:'owner-123',approved:true,ownerAuthenticated:true,approvedBeforeExecution:true,denied:true,reservationObserved:true};
  const payload=[issuer,event.eventId,event.kind,event.taskId,event.stepId,event.idempotencyKey,event.deploymentCommit,event.timestamp,kind==='owner-authenticated-approval'?event.ownerPrincipal:'',kind==='owner-authenticated-approval'?'approved':'denied'].join('\n');
  const signature=b64(await webcrypto.subtle.sign('Ed25519',pair.privateKey,new TextEncoder().encode(payload)));
  return {issuer,event,signature};
 };
 const approved=await emit('owner-authenticated-approval'),replay=await emit('observed-replay-denial');
 const reader=createSignedProvenanceInspectors({issuer,publicKey,now,cryptoImpl:webcrypto,readEvent:async s=>s.kind===approved.event.kind?approved:replay});
 assert.equal((await reader.approvalEvidence(scope)).sourceVerified,true);
 assert.equal((await reader.replayEvidence(scope)).sourceVerified,true);
 const forged=createSignedProvenanceInspectors({issuer,publicKey,now,cryptoImpl:webcrypto,readEvent:async()=>({...approved,event:{...approved.event,taskId:'different-task'}})});
 assert.deepEqual(await forged.approvalEvidence(scope),{});
 const forgedIssuer=createSignedProvenanceInspectors({issuer,publicKey,now,cryptoImpl:webcrypto,readEvent:async()=>({...approved,issuer:'evil'})});
 assert.deepEqual(await forgedIssuer.approvalEvidence(scope),{});
 const old=createSignedProvenanceInspectors({issuer,publicKey,now:'2026-10-24T20:00:00Z',cryptoImpl:webcrypto,readEvent:async()=>approved});
 assert.deepEqual(await old.approvalEvidence(scope),{});
});
test('missing pinned issuer, public key, or event source fails closed',async()=>{
 const x=createSignedProvenanceInspectors({});
 assert.deepEqual(await x.approvalEvidence(scope),{});
 assert.deepEqual(await x.replayEvidence(scope),{});
});
