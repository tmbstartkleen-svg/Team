// Authenticated read-only provenance lookup. Events must be signed by a pinned
// Ed25519 audit issuer; a caller-supplied sourceVerified flag has no authority.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const SHA=/^[0-9a-f]{40}$/;
const PUB=/^[A-Za-z0-9_-]{43}$/;
const kinds=new Set(['owner-authenticated-approval','observed-replay-denial']);
const decode=s=>{if(typeof s!=='string'||!/^[A-Za-z0-9_-]+$/.test(s))throw Error('invalid_base64url');const b=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(b,c=>c.charCodeAt(0))};
export function createSignedProvenanceInspectors({readEvent,publicKey,issuer,now,cryptoImpl=globalThis.crypto}={}){
 const disabled=async()=>({});
 if(typeof readEvent!=='function'||typeof issuer!=='string'||!ID.test(issuer)
    ||!PUB.test(publicKey||'')||!Number.isFinite(Date.parse(now||''))||!cryptoImpl?.subtle)
  return Object.freeze({approvalEvidence:disabled,replayEvidence:disabled});
 let keyPromise;
 const inspect=kind=>async scope=>{
  if(!kinds.has(kind)||!ID.test(scope?.taskId||'')||!ID.test(scope?.stepId||'')
     ||!ID.test(scope?.idempotencyKey||''))return {};
  try{
   const signed=await readEvent(Object.freeze({kind,taskId:scope.taskId,stepId:scope.stepId,idempotencyKey:scope.idempotencyKey}));
   const e=signed?.event;
   if(!e||signed?.issuer!==issuer||e.kind!==kind||e.taskId!==scope.taskId
      ||e.stepId!==scope.stepId||e.idempotencyKey!==scope.idempotencyKey
      ||!ID.test(e.eventId||'')||!SHA.test(e.deploymentCommit||'')
      ||!Number.isFinite(Date.parse(e.timestamp||'')))return {};
   const age=Date.parse(now)-Date.parse(e.timestamp);
   if(age<0||age>86400000||!/^[-_A-Za-z0-9]{86}$/.test(signed.signature||''))return {};
   if(kind==='owner-authenticated-approval'&&!(e.approved===true&&e.ownerAuthenticated===true
      &&e.approvedBeforeExecution===true&&ID.test(e.ownerPrincipal||'')))return {};
   if(kind==='observed-replay-denial'&&!(e.denied===true&&e.reservationObserved===true))return {};
   if(!keyPromise)keyPromise=cryptoImpl.subtle.importKey('raw',decode(publicKey),{name:'Ed25519'},false,['verify']);
   const key=await keyPromise;
   // Strictly specified serialization; signer must use this exact ordered vector.
   const payload=[issuer,e.eventId,e.kind,e.taskId,e.stepId,e.idempotencyKey,
      e.deploymentCommit,e.timestamp,
      kind==='owner-authenticated-approval'?e.ownerPrincipal:'',
      kind==='owner-authenticated-approval'?'approved':'denied'].join('\n');
   const verified=await cryptoImpl.subtle.verify('Ed25519',key,decode(signed.signature),new TextEncoder().encode(payload));
   if(!verified)return {};
   return kind==='owner-authenticated-approval'
    ?{kind,sourceVerified:true,taskId:e.taskId,stepId:e.stepId,approved:true,ownerAuthenticated:true,approvedBeforeExecution:true}
    :{kind,sourceVerified:true,taskId:e.taskId,stepId:e.stepId,idempotencyKey:e.idempotencyKey,denied:true};
  }catch{return {}}
 };
 return Object.freeze({approvalEvidence:inspect('owner-authenticated-approval'),replayEvidence:inspect('observed-replay-denial')});
}
