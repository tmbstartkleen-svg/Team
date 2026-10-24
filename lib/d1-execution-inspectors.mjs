// Read-only D1 projections of existing persisted task and action-ledger state.
// Approval identity, approval chronology, external execution, and replay-denial
// attestations are intentionally NOT inferred from D1 state.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const valid=s=>typeof s==='string'&&ID.test(s);
export function createD1ExecutionInspectors(db){
 const empty={};
 const query=async(sql,args)=>{
  if(!db?.prepare||!args.every(valid))return null;
  try{return await db.prepare(sql).bind(...args).first()}catch{return null}
 };
 return Object.freeze({
  async inspectTask(s){
   if(!valid(s?.taskId)||!valid(s?.stepId))return empty;
   const row=await query('SELECT t.id AS task_id,t.state,g.step_id,g.tool,g.idempotency_key FROM team_tasks t JOIN team_tool_step_grants g ON g.task_id=t.id WHERE t.id=? AND g.step_id=?',[s.taskId,s.stepId]);
   if(!row||row.idempotency_key!==s.idempotencyKey)return empty;
   return {taskId:row.task_id,stepId:row.step_id,state:row.state,tool:row.tool};
  },
  async inspectLedger(s){
   if(!valid(s?.taskId)||!valid(s?.stepId)||!valid(s?.idempotencyKey))return empty;
   const row=await query('SELECT task_id,step_id,state,receipt_id,created_at FROM team_tool_action_ledger WHERE idempotency_key=?',[s.idempotencyKey]);
   if(!row||row.task_id!==s.taskId||row.step_id!==s.stepId||row.receipt_id!==s.receiptId)return empty;
   return {taskId:row.task_id,stepId:row.step_id,found:true,state:row.state,receiptPresent:valid(row.receipt_id),reservedAt:row.created_at};
  },
  async inspectReceipt(s){
   if(!valid(s?.taskId)||!valid(s?.stepId)||!valid(s?.idempotencyKey)||!valid(s?.receiptId))return empty;
   const row=await query('SELECT a.task_id,a.step_id,a.state,a.receipt_id,a.evidence,g.tool FROM team_tool_action_ledger a JOIN team_tool_step_grants g ON g.task_id=a.task_id AND g.step_id=a.step_id WHERE a.idempotency_key=?',[s.idempotencyKey]);
   if(!row||row.task_id!==s.taskId||row.step_id!==s.stepId||row.state!=='confirmed'||row.receipt_id!==s.receiptId||typeof row.evidence!=='string'||row.evidence.length<8)return empty;
   return {taskId:row.task_id,stepId:row.step_id,receiptId:row.receipt_id,durable:true,tool:row.tool};
  }
 });
}
