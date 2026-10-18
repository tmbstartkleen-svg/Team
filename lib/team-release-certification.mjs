// Independent release gate: CI success is not a substitute for live production evidence.
// Incomplete or ambiguous evidence keeps the public launch gate closed.
const REQUIRED=[
 'ci','merged-main','deployed-worker','d1-migrations','authenticated-owner',
 'authenticated-executor','real-read-adapter','approved-write-adapter',
 'durable-recovery','persona-e2e','monitoring','rollback','owner-signoff'
];
export const RELEASE_EVIDENCE_REQUIREMENTS=Object.freeze([...REQUIRED]);
export function assessTeamRelease(evidence={}){
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw new TypeError('invalid_release_evidence');
 const checks=REQUIRED.map(key=>{
  const entry=evidence[key];
  const verified=entry?.verified===true&&typeof entry.reference==='string'&&entry.reference.trim().length>=8;
  return {key,verified};
 });
 const missing=checks.filter(x=>!x.verified).map(x=>x.key);
 return {launchReady:missing.length===0,status:missing.length===0?'ready-for-owner-release':'blocked',missing,checks};
}
