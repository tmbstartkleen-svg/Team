// Independent upstream observations are only data until checked with a pinned
// origin public key by createVerifiedOriginObserver. No approval or replay calls.
const ID=/^[A-Za-z0-9_.:-]{8,128}$/;
const PROTECTED=new Set(['cert-github-read-20261018','cert-github-read-20261019-v2']);
export function createD1OriginObservationReader(db){
 return async ({kind,taskId,stepId,idempotencyKey}={})=>{
  if(!db?.prepare||PROTECTED.has(taskId)||!['owner-authenticated-approval','observed-replay-denial'].includes(kind)
    ||![taskId,stepId,idempotencyKey].every(x=>ID.test(x||'')))return null;
  try{
   const rows=await db.prepare('SELECT issuer,event_json,signature FROM team_origin_observations WHERE kind=? AND task_id=? AND step_id=? AND idempotency_key=? LIMIT 2')
    .bind(kind,taskId,stepId,idempotencyKey).all();
   if(!Array.isArray(rows?.results)||rows.results.length!==1)return null;
   const r=rows.results[0];
   if(typeof r.event_json!=='string'||r.event_json.length>4096)return null;
   const event=JSON.parse(r.event_json);
   if(!event||typeof event!=='object'||Array.isArray(event))return null;
   return {issuer:r.issuer,event,signature:r.signature};
  }catch{return null}
 };
}
