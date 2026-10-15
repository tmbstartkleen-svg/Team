// Delivery receipts must come from an authenticated transport, not an agent assertion.
export async function queueMessageDelivery(db,{messageId,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_dispatch_required');
 if(!db?.prepare||typeof messageId!=='string'||!messageId.trim())throw new TypeError('invalid_message_id');
 return await db.prepare("INSERT INTO team_message_delivery(message_id,state) SELECT id,'queued' FROM team_messages WHERE id=? ON CONFLICT(message_id) DO UPDATE SET state='queued',updated_at=CURRENT_TIMESTAMP WHERE team_message_delivery.state IN ('draft','failed') RETURNING message_id,state").bind(messageId).first()||null;
}
export async function recordDeliveryResult(db,{messageId,receipt=null,error=null,authorized=false}={}){
 if(!authorized)throw new Error('authenticated_dispatch_required');
 if(!db?.prepare||typeof messageId!=='string'||!messageId.trim())throw new TypeError('invalid_message_id');
 if(Boolean(receipt)===Boolean(error))throw new TypeError('exactly_one_delivery_outcome_required');
 if(receipt!==null&&(typeof receipt!=='string'||receipt.trim().length<8||receipt.length>500))throw new TypeError('invalid_receipt');
 if(error!==null&&(typeof error!=='string'||!error.trim()||error.length>300))throw new TypeError('invalid_error');
 return await db.prepare("UPDATE team_message_delivery SET state=?,attempt_count=attempt_count+1,delivery_receipt=?,last_error=?,updated_at=CURRENT_TIMESTAMP WHERE message_id=? AND state='queued' RETURNING message_id,state").bind(receipt?'delivered':'failed',receipt,error,messageId).first()||null;
}
