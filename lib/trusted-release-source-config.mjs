import {createGithubCiEvidenceVerifier} from './github-ci-evidence-verifier.mjs';
// Server-only composition: no public request or UI values may supply these settings.
// Activation is explicitly disabled unless operator provisions every prerequisite.
const SHA=/^[a-f0-9]{40}$/;
export function buildTrustedReleaseSources(env={},runtime={}){
 if(env.TEAM_RELEASE_EVIDENCE_READ_ENABLED!=='true'
   ||!SHA.test(env.TEAM_DEPLOYMENT_COMMIT||'')
   ||!env.TEAM_GITHUB_EVIDENCE_TOKEN
   ||typeof runtime.fetchImpl!=='function'
   ||typeof runtime.now!=='string'
   ||!Number.isFinite(Date.parse(runtime.now)))return {};
 const repository='tmbstartkleen-svg/Team';
 return Object.freeze({
  deploymentCommit:env.TEAM_DEPLOYMENT_COMMIT,
  now:runtime.now,
  verifiers:Object.freeze({
   'github-actions':createGithubCiEvidenceVerifier({
    fetchImpl:runtime.fetchImpl,repository,apiToken:env.TEAM_GITHUB_EVIDENCE_TOKEN
   })
  })
 });
}
