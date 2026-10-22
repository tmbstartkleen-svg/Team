// Pure fail-closed manifest structure validation. No approval, signature verification, or deployment authority.
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function validateDeploymentManifest(manifest){
 if(!manifest||typeof manifest!=='object'||Array.isArray(manifest))return {valid:false,reason:'invalid_manifest'};
 const m=manifest;
 if(m.schema_version!==1||m.repository!=='tmbstartkleen-svg/Team'||m.source_ref!=='refs/heads/main'
   ||!SHA.test(m.source_commit||'')||!DIGEST.test(m.artifact_sha256||'')
   ||m.worker_name!=='atlas-team'||m.environment!=='production'
   ||!UUID.test(m.worker_version_id||'')||!UUID.test(m.deployment_id||'')
   ||m.deployed_percentage!==100
   ||!Number.isSafeInteger(m.github_workflow_run_id)||m.github_workflow_run_id<=0
   ||!Number.isSafeInteger(m.github_workflow_run_attempt)||m.github_workflow_run_attempt<=0
   ||m.github_workflow_url!=='https://github.com/tmbstartkleen-svg/Team/actions/runs/'+m.github_workflow_run_id
   ||!Number.isFinite(Date.parse(m.deployment_observed_at||'')))return {valid:false,reason:'invalid_fields'};
 return {valid:true,provenanceVerified:false,releaseAuthorized:false};
}
