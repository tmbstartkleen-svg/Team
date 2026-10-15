// Server-side D1 queue primitives. Only an authenticated, authorized worker may call these.
export async function claimApprovedTask(db,{id,leaseToken,leaseUntil}){
 if(!db?.prepare||typeof id!=='string'||!id.trim()||typeof leaseToken!=='string'||leaseToken.length<16||typeof leaseUntil!=='string'||!Number.isFinite(Date.parse(leaseUntil)))throw new TypeError('invalid_claim');
 const r=await db.prepare("UPDATE team_tasks SET state='running', lease_token=?, lease_until=?, attempt_count=attempt_count+1, updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='queued' AND owner_approved=1 AND datetime(?)>datetime('now') RETURNING id,lease_token,attempt_count").bind(leaseToken,leaseUntil,id,leaseUntil).first();
 return r||null;
}
export async function verifyClaimedTask(db,{id,leaseToken,evidence}){
 if(!db?.prepare||typeof id!=='string'||!id.trim()||typeof leaseToken!=='string'||leaseToken.length<16||typeof evidence!=='string'||evidence.trim().length<8)throw new TypeError('invalid_verification');
 return await db.prepare("UPDATE team_tasks SET state='verified',completion_evidence=?,lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='running' AND lease_token=? AND lease_until IS NOT NULL AND datetime(lease_until)>datetime('now') RETURNING id,state").bind(evidence.trim(),id,leaseToken).first()||null;
}

export async function expireTaskLease(db,{id,leaseToken}){
 if(!db?.prepare||typeof id!=='string'||!id.trim()||typeof leaseToken!=='string'||leaseToken.length<16)throw new TypeError('invalid_expiration');
 return await db.prepare("UPDATE team_tasks SET state='blocked',lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='running' AND lease_token=? AND lease_until IS NOT NULL AND datetime(lease_until)<=datetime('now') RETURNING id,state").bind(id,leaseToken).first()||null;
}

export async function blockClaimedTask(db,{id,leaseToken,reason}){
 if(!db?.prepare||typeof id!=='string'||!id.trim()||typeof leaseToken!=='string'||leaseToken.length<16||!['needs-review','execution-error','verification-rejected'].includes(reason))throw new TypeError('invalid_block');
 return await db.prepare("UPDATE team_tasks SET state='blocked',lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='running' AND lease_token=? RETURNING id,state").bind(id,leaseToken).first()||null;
}
