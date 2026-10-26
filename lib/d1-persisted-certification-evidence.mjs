import {verifyTrustedStagingAttestation} from './trusted-staging-attestation.mjs';

// Read-only verification of immutable, owner-reviewed staging records.
// This module never inserts evidence, approves tasks, or elevates readiness.
// The evidence table schema is deliberately NOT deployed by this change.
const fail=reason=>({ok:false,reason,readinessGranted:false});
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,127}$/;
const enc=new TextEncoder();
async function digestHex(value){
 const hash=await crypto.subtle.digest('SHA-256',enc.encode(value));
 return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
export async function verifyPersistedStagingEvidence({db,evidenceId,trust,now=Date.now()}={}){
 if(!ID.test(evidenceId||''))return fail('invalid_evidence_id');
 if(!db?.prepare)return fail('database_not_bound');
 if(trust?.environment!=='staging')return fail('trusted_staging_context_missing');
 try{
  const stored=await db.prepare('SELECT id,task_id,gate,envelope_json,envelope_sha256 FROM team_certification_evidence WHERE id=?').bind(evidenceId).first();
  if(!stored||stored.id!==evidenceId||typeof stored.envelope_json!=='string'||
     stored.envelope_json.length>16384||!/^[a-f0-9]{64}$/.test(stored.envelope_sha256||''))return fail('evidence_record_invalid');
  if(await digestHex(stored.envelope_json)!==stored.envelope_sha256)return fail('evidence_integrity_failed');
  const revoked=await db.prepare('SELECT id FROM team_certification_revocations WHERE evidence_id=? LIMIT 1').bind(evidenceId).first();
  if(revoked)return fail('evidence_revoked');
  let envelope;
  try{envelope=JSON.parse(stored.envelope_json)}catch{return fail('evidence_json_invalid')}
  if(!envelope||envelope.record?.id!==stored.id||envelope.record?.taskId!==stored.task_id||
     envelope.record?.gate!==stored.gate)return fail('evidence_index_mismatch');
  const verified=await verifyTrustedStagingAttestation({db,envelope,trust,now});
  if(!verified.ok)return fail(verified.reason);
  return {ok:true,structurallyAndCryptographicallyVerified:true,
    issuerIdentityVerified:true,receiptProvenanceVerified:true,
    evidenceId,readinessGranted:false,requiresOwnerRelease:true};
 }catch{return fail('evidence_storage_unavailable')}
}
