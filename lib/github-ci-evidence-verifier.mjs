// A deliberately narrow, independently retrievable GitHub Actions CI artifact adapter.
// This adapter does not inspect owner approvals or certify tool executions.
const RUN=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/actions\/runs\/([1-9][0-9]*)$/;
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
export function createGithubCiEvidenceVerifier({fetchImpl,repository,apiToken}={}){
 if(typeof fetchImpl!=='function'||typeof repository!=='string'||!apiToken)return async()=>({verified:false});
 return async function verify(proof){
  const match=RUN.exec(proof?.reference||'');
  if(!match||repository!==match[1]+'/'+match[2]||proof.requirement!=='ci'
    ||proof.issuer!=='github-actions'||proof.environment!=='production'
    ||!SHA.test(proof.commit||'')||!DIGEST.test(proof.digest||''))return {verified:false};
  // Digest is over canonical run identity. Do not trust an arbitrary DB digest.
  const api='https://api.github.com/repos/'+match[1]+'/'+match[2]+'/actions/runs/'+match[3];
  try{
   const result=await fetchImpl(api,{method:'GET',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+apiToken,'X-GitHub-Api-Version':'2022-11-28'},redirect:'error'});
   if(!result?.ok)return {verified:false};
   const run=await result.json();
   if(run?.id!==Number(match[3])||run?.status!=='completed'||run?.conclusion!=='success'
     ||run?.head_sha!==proof.commit||run?.repository?.full_name!==repository
     ||run?.event!=='push'||run?.head_branch!=='main')return {verified:false};
   const canonical=JSON.stringify({repository,runId:run.id,commit:run.head_sha,conclusion:run.conclusion,event:run.event,branch:run.head_branch});
   const bytes=new TextEncoder().encode(canonical);
   // WebCrypto supplied only from trusted runtime; if unavailable, fail closed.
   if(!globalThis.crypto?.subtle)return {verified:false};
   const hash=await globalThis.crypto.subtle.digest('SHA-256',bytes);
   const digest=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
   if(digest!==proof.digest)return {verified:false};
   return {verified:true,issuer:'github-actions',artifactDigest:digest};
  }catch{return {verified:false}}
 };
}
