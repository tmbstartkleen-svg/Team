// Called only after authenticated executor authorization.
// Atomic D1 batch records verification and an immutable receipt together.
// The receipt INSERT intentionally violates its NOT NULL task_id constraint when
// the preceding guarded UPDATE changed no row, rolling back the entire batch.
export async function verifyTaskWithReceipt(db,{taskId,leaseToken,receiptId,evidence}){
 if(!db?.prepare||!db?.batch||typeof taskId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(taskId)||typeof leaseToken!=='string'||leaseToken.length<16||typeof receiptId!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(receiptId)||typeof evidence!=='string'||evidence.trim().length<8||evidence.length>2000)throw new TypeError('invalid_execution_receipt');
 const update=db.prepare("UPDATE team_tasks SET state='verified',completion_evidence=?,lease_token=NULL,lease_until=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND state='running' AND lease_token=? AND lease_until IS NOT NULL AND datetime(lease_until)>datetime('now') RETURNING id").bind(evidence.trim(),taskId,leaseToken);
 const insert=db.prepare("INSERT INTO team_execution_receipts(id,task_id,attempt_count,outcome,evidence) VALUES (?,(SELECT id FROM team_tasks WHERE id=? AND changes()=1 AND state='verified'),(SELECT attempt_count FROM team_tasks WHERE id=? AND state='verified'),'verified',?) RETURNING id").bind(receiptId,taskId,taskId,evidence.trim());
 const rows=await db.batch([update,insert]);
 if(rows?.[0]?.results?.length!==1||rows?.[1]?.results?.length!==1)throw new Error('verification_not_recorded');
 return {taskId,receiptId,state:'verified',recorded:true};
}
