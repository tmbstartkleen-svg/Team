import {proposeSpecialistLearning} from './specialist-learning-policy.mjs';
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
// D1 store, never accepts a browser-provided assertion of consent or ownership.
export async function saveSpecialistLearningProposal(db,{ownerId,proposal}={}){
 if(!db?.prepare||!ID.test(ownerId||''))throw new TypeError('invalid_learning_storage');
 // Check consent from the trusted database on every write.
 const consent=await db.prepare('SELECT enabled FROM team_memory_consent WHERE owner_id=?').bind(ownerId).first();
 if(consent?.enabled!==1)return {ok:false,reason:'owner_consent_required',persisted:false};
 const checked=proposeSpecialistLearning(proposal,{consent:true});
 if(!checked.ok)return {...checked,persisted:false};
 try{
  const result=await db.prepare(`INSERT OR IGNORE INTO team_specialist_learning
 (id,owner_id,specialist_id,type,summary,evidence_ref,state)
 VALUES (?,?,?,?,?,?,'proposed')`)
 .bind(checked.id,ownerId,checked.specialistId,checked.type,checked.summary,checked.evidenceRef).run();
  if(result?.success!==true||result.meta?.changes!==1)
   return {ok:false,persisted:false,reason:'duplicate_or_write_unverified'};
  return {ok:true,persisted:true,state:'proposed',id:checked.id,specialistId:checked.specialistId};
 }catch{return {ok:false,persisted:false,reason:'learning_store_unavailable'};}
}
export async function listSpecialistLearningProposals(db,{ownerId,specialistId}={}){
 if(!db?.prepare||!ID.test(ownerId||'')||!ID.test(specialistId||''))throw new TypeError('invalid_learning_lookup');
 const consent=await db.prepare('SELECT enabled FROM team_memory_consent WHERE owner_id=?').bind(ownerId).first();
 if(consent?.enabled!==1)return {ok:false,reason:'owner_consent_required',records:[]};
 const r=await db.prepare(`SELECT id,specialist_id,type,summary,evidence_ref,state,created_at
 FROM team_specialist_learning WHERE owner_id=? AND specialist_id=?
 AND state='proposed' ORDER BY created_at DESC LIMIT 50`).bind(ownerId,specialistId).all();
 return {ok:true,records:Array.isArray(r?.results)?r.results:[]};
}
// Revocation stays available even if consent has since been disabled.
// Actual promotion is deliberately not implemented until independent server-owner verification.
export async function revokeSpecialistLearning(db,{ownerId,id}={}){
 if(!db?.prepare||!ID.test(ownerId||'')||!ID.test(id||''))throw new TypeError('invalid_learning_revoke');
 const r=await db.prepare(`UPDATE team_specialist_learning SET state='revoked'
 WHERE owner_id=? AND id=? AND state IN ('proposed','promoted')`).bind(ownerId,id).run();
 return {ok:r?.success===true&&r.meta?.changes===1,revoked:r?.meta?.changes===1};
}
