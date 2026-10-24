import {validateDeploymentManifest} from './deployment-provenance-manifest.mjs';

// Read-only independent provider cross-check. It intentionally does not certify
// bundle identity, signatures, owner approvals or operational launch.
export async function observeDeploymentProvenance(manifest,{fetchGithubRun,fetchCloudflareDeployment}={}){
 if(validateDeploymentManifest(manifest).valid!==true||typeof fetchGithubRun!=='function'
   ||typeof fetchCloudflareDeployment!=='function')
  return {providerMatches:false,provenanceVerified:false,releaseAuthorized:false};
 try{
  const [run,deployment]=await Promise.all([
   fetchGithubRun(manifest.github_workflow_run_id),
   fetchCloudflareDeployment(manifest.deployment_id)
  ]);
  const githubMatches=run?.id===manifest.github_workflow_run_id
   &&run?.run_attempt===manifest.github_workflow_run_attempt
   &&run?.repository?.full_name===manifest.repository
   &&run?.head_sha===manifest.source_commit
   &&run?.head_branch==='main'
   &&run?.event==='push'
   &&run?.status==='completed'&&run?.conclusion==='success';
  const versions=deployment?.versions;
  const cloudflareMatches=deployment?.id===manifest.deployment_id
   &&Array.isArray(versions)&&versions.length===1
   &&versions[0]?.version_id===manifest.worker_version_id
   &&versions[0]?.percentage===manifest.deployed_percentage;
  return {providerMatches:githubMatches&&cloudflareMatches,
   provenanceVerified:false,releaseAuthorized:false};
 }catch{return {providerMatches:false,provenanceVerified:false,releaseAuthorized:false}}
}
