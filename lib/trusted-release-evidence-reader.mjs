import {evaluateTrustedReleaseEvidence} from './trusted-release-evidence-verifier.mjs';

// Read-only registry integration. No request payload supplies verifiers, approvals,
// execution grants or release authority. Until independently authenticated source
// adapters are installed, every stored row remains unverified.
const COMMIT=/^[a-f0-9]{40}$/;
export async function readTrustedReleaseEvidence({db,deploymentCommit,now,verifiers}={}){
 if(!COMMIT.test(deploymentCommit||'')||typeof now!=='string')return {};
 if(!db?.prepare||typeof verifiers!=='object'||!verifiers)return {};
 try{
  const query=db.prepare('SELECT id,requirement_key,issuer,source_family,artifact_ref,artifact_sha256,environment,deployment_commit,verification_method,verdict,supersedes_event_id,event_time FROM team_release_evidence_events WHERE environment=? AND deployment_commit=? ORDER BY recorded_at DESC LIMIT 500');
  const rows=await query.bind('production',deploymentCommit).all();
  if(!Array.isArray(rows?.results)||rows.results.length>=500)return {};
  // Caller-owned verifiers must be injected by trusted server code only.
  return await evaluateTrustedReleaseEvidence({events:rows.results,deploymentCommit,environment:'production',now,verifiers});
 }catch{return {}}
}
