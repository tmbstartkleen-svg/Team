import {validateCertificationEvidence} from './certification-evidence-contract.mjs';

// Verify a canonical, signed record using an out-of-band pinned public key.
// Caller must obtain trusted release identity and pinned key independently.
// Signature verification is NOT task authorization or a live launch certificate.
const KEYS=['version','id','gate','taskId','environment','sourceCommit','databaseId','deploymentId','observedAt','expiresAt','status','receiptIds','ownerDecisionId','issuerId'];
const ENVELOPE_KEYS=['record','signature','keyId'];
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const fail=reason=>({ok:false,reason,readinessGranted:false});
export function canonicalEvidencePayload(record){
 if(!record||typeof record!=='object'||Array.isArray(record)||Object.keys(record).length!==KEYS.length||
   KEYS.some(key=>!Object.hasOwn(record,key)))throw new TypeError('invalid_signed_record_shape');
 return JSON.stringify(KEYS.map(key=>[key,record[key]]));
}
function decodeBase64Url(value){
 if(typeof value!=='string'||!/^[A-Za-z0-9_-]+$/.test(value)||value.length>1024)return null;
 try{
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bits=0,acc=0;
  const result=[];
  for(const char of value.replace(/-/g,'+').replace(/_/g,'/')){
   const pos=alphabet.indexOf(char);
   if(pos<0)return null;
   acc=(acc<<6)|pos;bits+=6;
   if(bits>=8){bits-=8;result.push((acc>>>bits)&255)}
  }
  if(bits!==0&&(acc&((1<<bits)-1))!==0)return null;
  return new Uint8Array(result);
 }catch{return null}
}
export async function verifySignedCertificationEvidence(envelope,context={},now=Date.now()){
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope)||
   Object.keys(envelope).length!==ENVELOPE_KEYS.length||
   ENVELOPE_KEYS.some(k=>!Object.hasOwn(envelope,k)))return fail('invalid_envelope');
 if(!ID.test(envelope.keyId||'')||envelope.keyId!==context.pinnedKeyId)return fail('signing_key_not_pinned');
 const structural=validateCertificationEvidence(envelope.record,context,now);
 if(!structural.ok)return fail(structural.reason);
 let payload;
 try{payload=canonicalEvidencePayload(envelope.record)}catch{return fail('invalid_signed_record_shape')}
 const raw=decodeBase64Url(envelope.signature);
 if(!raw||raw.length!==64)return fail('invalid_signature_encoding');
 const jwk=context.pinnedPublicKey;
 if(!jwk||jwk.kty!=='EC'||jwk.crv!=='P-256'||(jwk.alg!==undefined&&jwk.alg!=='ES256')||
    jwk.key_ops?.some(op=>op!=='verify')||jwk.d||!jwk.x||!jwk.y)return fail('invalid_pinned_key');
 try{
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const verified=await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,raw,new TextEncoder().encode(payload));
  if(!verified)return fail('signature_invalid');
  return {ok:true,reason:null,signatureVerified:true,readinessGranted:false,requiresDurableProvenanceAndReleaseVerification:true};
 }catch{return fail('signature_verification_failed')}
}
