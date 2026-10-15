// Server-side D1 queue primitives. Only an authenticated, authorized worker may call these.
export async function claimApprovedTask(db,{id,leaseToken,leaseUntil}){
 if(!db?.prepare||typeof id!=='string'||!id.trim()||typeof leaseToken!=='string'||leaseToken.length<16||typeof leaseUntil!=='string'||!Number.isFinite(Date.parse(leaseUntil)))throw new TypeError('invalid_claim');
 const r=await db.prepare("UPDATE team_tasks SET state='running', lease_token=?, lease_until=?, attempt_count=attempt_count+1, updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='queued' AND owner_approved=1 RETURNING id,lease_token,attempt_count").bind(leaseToken,leaseUntil,id).first();
 return r||null;
}
export async function verifyClaimedTask(db,{id,leaseToken,evidence}){
 if(!db?.prepare||typeof id!=='string'||!id.trim()||typeof leaseToken!=='string'||leaseToken.length<16||typeof evidence!=='string'||evidence.trim().length<8)throw new TypeError('invalid_verification');
 return await db.prepare("UPDATE team_tasks SET state='verified',completion_evidence=?,lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='running' AND lease_token=? RETURNING id,state").bind(evidence.trim(),id,leaseToken).first()||null;
}
