// Public, non-sensitive Cloudflare D1 readiness probe.
// A successful schema check does not mean owner identity or agent execution is operational.
export async function inspectTeamDatabase(db){
 if(!db?.prepare)return {bindingConfigured:false,schemaVerified:false,tables:[],error:'TEAM_DB_binding_missing'};
 const toolNames=['team_tool_action_ledger','team_tool_step_grants'];
 const names=['team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery'];
 try{
  const result=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery','team_tool_action_ledger','team_tool_step_grants')").all();
  const tables=(result.results||[]).map(x=>x.name).filter(x=>names.includes(x));
  return {bindingConfigured:true,schemaVerified:names.every(x=>tables.includes(x)),toolSchemaVerified:toolNames.every(x=>(result.results||[]).some(y=>y.name===x)),tables,error:null};
 }catch{return {bindingConfigured:true,schemaVerified:false,tables:[],error:'database_query_failed'}}
}
