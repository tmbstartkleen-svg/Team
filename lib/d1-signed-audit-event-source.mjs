// Read-only, signed audit-event source. A pinned verification key checks the
// artifact, never a stored "sourceVerified" boolean or a caller's claim.
// No writer, approval, execution, replay, or public route is introduced.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
export function createD1SignedAuditEventSource({db}={}){
 return async ({kind,taskId,stepId,idempotencyKey}={})=>{
  if(!db?.prepare||!['owner-authenticated-approval','observed-replay-denial'].includes(kind)
     ||![taskId,stepId,idempotencyKey].every(x=>typeof x==='string'&&ID.test(x)))return null;
  try{
   const result=await db.prepare('SELECT issuer,event_json,signature FROM team_signed_audit_events WHERE kind=? AND task_id=? AND step_id=? AND idempotency_key=? ORDER BY recorded_at DESC LIMIT 2')
    .bind(kind,taskId,stepId,idempotencyKey).all();
   // Ambiguous duplicate attestations are not proof.
   if(!Array.isArray(result?.results)||result.results.length!==1)return null;
   const row=result.results[0];
   if(typeof row?.event_json!=='string'||row.event_json.length>4096)return null;
   const event=JSON.parse(row.event_json);
   if(!event||typeof event!=='object'||Array.isArray(event))return null;
   return {issuer:row.issuer,event,signature:row.signature};
  }catch{return null}
 };
}
