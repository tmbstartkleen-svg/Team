// Checks actual migration 0003, 0004, 0006 and 0007 prerequisites.
// Read-only; table existence alone cannot prove execution is usable.
export async function inspectExecutorSchema(db){
 if(!db?.prepare)return {ready:false,error:'TEAM_DB_binding_missing',missing:['team_tasks','team_approval_audit','team_execution_receipts']};
 try{
  const tablesResult=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('team_tasks','team_approval_audit','team_execution_receipts')").all();
  const tables=new Set((tablesResult.results||[]).map(r=>r.name));
  const required=['team_tasks','team_approval_audit','team_execution_receipts'];
  const missing=required.filter(x=>!tables.has(x));
  if(missing.length)return {ready:false,error:'executor_tables_missing',missing};
  const columns=await db.prepare("PRAGMA table_info('team_tasks')").all();
  const found=new Set((columns.results||[]).map(r=>r.name));
  const missingColumns=['state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence','blocker_reason'].filter(x=>!found.has(x));
  if(missingColumns.length)return {ready:false,error:'executor_columns_missing',missing:[],missingColumns};
  const triggerResult=await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' AND name IN ('team_approval_audit_no_update','team_approval_audit_no_delete','team_execution_receipts_no_update','team_execution_receipts_no_delete')").all();
  const foundTriggers=new Set((triggerResult.results||[]).map(r=>r.name));
  const missingTriggers=['team_approval_audit_no_update','team_approval_audit_no_delete','team_execution_receipts_no_update','team_execution_receipts_no_delete'].filter(x=>!foundTriggers.has(x));
  return {ready:missingTriggers.length===0,error:missingTriggers.length?'executor_immutability_missing':null,missing:[],missingColumns:[],missingTriggers};
 }catch{return {ready:false,error:'executor_schema_query_failed',missing:[]}}
}
