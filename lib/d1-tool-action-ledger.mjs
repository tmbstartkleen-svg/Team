// Durable, fail-closed execution ledger for D1. DB must apply migration 0008 first.
// Records are deliberately separate from model-generated text or in-memory caches.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const STATES=new Set(['reserved','confirmed','needs-reconciliation']);
const valid=s=>typeof s==='string'&&ID.test(s);
export async function reserveToolAction(db,{taskId,stepId,idempotencyKey,onStage}={}){
 if(typeof onStage==='function')onStage('reservation_validate');
 if(!db?.prepare||!valid(taskId)||!valid(stepId)||!valid(idempotencyKey))
  throw new TypeError('invalid_action_reservation');
 // A UNIQUE key across tasks prevents the same external effect from being reused.
 if(typeof onStage==='function')onStage('reservation_prepare');
 const statement=db.prepare("INSERT INTO team_tool_action_ledger(idempotency_key,task_id,step_id,state) VALUES(?,?,?,'reserved') ON CONFLICT DO NOTHING");
 if(typeof onStage==='function')onStage('reservation_bind');
 const bound=statement.bind(idempotencyKey,taskId,stepId);
 if(typeof onStage==='function')onStage('reservation_run');
 const inserted=await bound.run();
 if(typeof onStage==='function')onStage('reservation_result');
 if(inserted?.meta?.changes===1)return {reserved:true,status:'reserved'};
 if(typeof onStage==='function')onStage('reservation_lookup');
 const existing=await db.prepare('SELECT task_id,step_id,state FROM team_tool_action_ledger WHERE idempotency_key=?').bind(idempotencyKey).first();
 if(!existing)return {reserved:false,status:'needs-reconciliation'};
 if(existing.task_id!==taskId||existing.step_id!==stepId)return {reserved:false,status:'collision'};
 return {reserved:false,status:STATES.has(existing.state)?existing.state:'needs-reconciliation'};
}
export async function recordToolActionOutcome(db,{taskId,stepId,idempotencyKey,receiptId,evidence,confirmed=false}={}){
 if(!db?.prepare||!valid(taskId)||!valid(stepId)||!valid(idempotencyKey))throw new TypeError('invalid_action_outcome');
 if(confirmed&&(!valid(receiptId)||typeof evidence!=='string'||evidence.trim().length<8||evidence.length>2000))
  throw new TypeError('invalid_action_receipt');
 // The same receipt cannot be attached to a different execution.
 const next=confirmed?'confirmed':'needs-reconciliation';
 const result=await db.prepare("UPDATE team_tool_action_ledger SET state=?,receipt_id=?,evidence=?,updated_at=CURRENT_TIMESTAMP WHERE idempotency_key=? AND task_id=? AND step_id=? AND state='reserved'")
  .bind(next,confirmed?receiptId:null,confirmed?evidence:null,idempotencyKey,taskId,stepId).run();
 return {recorded:result?.meta?.changes===1,status:result?.meta?.changes===1?next:'not-updated'};
}
