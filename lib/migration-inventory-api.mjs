import {authorized} from './owner-collaboration-api.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const requiredTables=['team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery','team_approval_audit','team_execution_receipts'];
const requiredTaskColumns=['state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence','blocker_reason','blocker_updated_at'];
export async function handleMigrationInventory(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 try{
  const results=await env.TEAM_DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const names=new Set((results.results||[]).map(row=>row.name));
  const missingTables=requiredTables.filter(name=>!names.has(name));
  let missingTaskColumns=[];
  if(names.has('team_tasks')){
   const columns=await env.TEAM_DB.prepare("PRAGMA table_info('team_tasks')").all();
   const found=new Set((columns.results||[]).map(row=>row.name));
   missingTaskColumns=requiredTaskColumns.filter(name=>!found.has(name));
  }
  return json({ok:true,allRequiredObjectsPresent:missingTables.length===0&&missingTaskColumns.length===0,missingTables,missingTaskColumns,migrationHistoryVerified:false,executorEnabled:false,note:'Schema inventory only; object presence does not certify migration history or live execution'});
 }catch{return json({ok:false,error:'migration_inventory_failed'},503)}
}
