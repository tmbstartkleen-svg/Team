// Delivery receipts must come from an authenticated transport, not an agent assertion.
export async function queueMessageDelivery(db,{messageId,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_dispatch_required');
 if(!db?.prepare||typeof messageId!=='string'||!messageId.trim())throw new TypeError('invalid_message_id');
 return await db.prepare("INSERT INTO team_message_delivery(message_id,state) SELECT id,'queued' FROM team_messages WHERE id=? ON CONFLICT(message_id) DO UPDATE SET state='queued',updated_at=CURRENT_TIMESTAMP WHERE team_message_delivery.state IN ('draft','failed') AND team_message_delivery.attempt_count < 3 RETURNING message_id,state").bind(messageId).first()||null;
}
export async function recordDeliveryResult(db,{messageId,receipt=null,error=null,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_dispatch_required');
 if(!db?.prepare||typeof messageId!=='string'||!messageId.trim())throw new TypeError('invalid_message_id');
 if(Boolean(receipt)===Boolean(error))throw new TypeError('exactly_one_delivery_outcome_required');
 if(receipt!==null&&(typeof receipt!=='string'||receipt.trim().length<8||receipt.length>500))throw new TypeError('invalid_receipt');
 if(error!==null&&(typeof error!=='string'||!error.trim()||error.length>300))throw new TypeError('invalid_error');
 return await db.prepare("UPDATE team_message_delivery SET state=?,attempt_count=attempt_count+1,delivery_receipt=?,last_error=?,updated_at=CURRENT_TIMESTAMP WHERE message_id=? AND state='sending' RETURNING message_id,state").bind(receipt?'delivered':'failed',receipt,error,messageId).first()||null;
}

export async function claimQueuedMessage(db,{messageId,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_dispatch_required');
 if(!db?.prepare||typeof messageId!=='string'||!messageId.trim())throw new TypeError('invalid_message_id');
 return await db.prepare("UPDATE team_message_delivery SET state='sending',updated_at=CURRENT_TIMESTAMP WHERE message_id=? AND state='queued' AND attempt_count<3 RETURNING message_id,state").bind(messageId).first()||null;
}

export async function quarantineStaleSending(db,{messageId,staleBefore,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_dispatch_required');
 if(!db?.prepare||typeof messageId!=='string'||!messageId.trim()||typeof staleBefore!=='string'||!Number.isFinite(Date.parse(staleBefore)))throw new TypeError('invalid_recovery');
 // Never requeue automatically: transport may have delivered before the worker crashed.
 return await db.prepare("UPDATE team_message_delivery SET state='needs-reconciliation',last_error='Delivery outcome unknown; inspect transport before retry',updated_at=CURRENT_TIMESTAMP WHERE message_id=? AND state='sending' AND updated_at<? RETURNING message_id,state").bind(messageId,staleBefore).first()||null;
}

export async function reconcileDelivery(db,{messageId,outcome,receipt=null,evidence,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_dispatch_required');
 if(!db?.prepare||typeof messageId!=='string'||!messageId.trim()||!['confirmed-delivered','confirmed-not-delivered'].includes(outcome)||typeof evidence!=='string'||evidence.trim().length<12||evidence.length>500)throw new TypeError('invalid_reconciliation');
 if(outcome==='confirmed-delivered'&&(typeof receipt!=='string'||receipt.trim().length<8||receipt.length>500))throw new TypeError('receipt_required');
 if(outcome==='confirmed-not-delivered'&&receipt!==null)throw new TypeError('unexpected_receipt');
 const state=outcome==='confirmed-delivered'?'delivered':'failed';
 // Failed outcomes still need explicit requeue by an authorized dispatcher; no automatic duplicate sends.
 return await db.prepare("UPDATE team_message_delivery SET state=?,delivery_receipt=?,last_error=?,attempt_count=attempt_count+1,updated_at=CURRENT_TIMESTAMP WHERE message_id=? AND state='needs-reconciliation' RETURNING message_id,state")
 .bind(state,receipt,outcome==='confirmed-not-delivered'?'Reviewed as not delivered: '+evidence.trim():null,messageId).first()||null;
}
