// Independent, read-only main-branch identity check. This cannot certify an approval or execution.
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
const REF=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/commit\/([a-f0-9]{40})$/;
export function createGithubMainEvidenceVerifier({fetchImpl,repository,apiToken,cryptoImpl=globalThis.crypto}={}){
 if(typeof fetchImpl!=='function'||!repository||!apiToken||!cryptoImpl?.subtle)return async()=>({verified:false});
 return async proof=>{
  const match=REF.exec(proof?.reference||'');
  if(!match||repository!==match[1]+'/'+match[2]||match[3]!==proof.commit
   ||proof.requirement!=='merged-main'||proof.issuer!=='github-main'
   ||proof.environment!=='production'||!SHA.test(proof.commit||'')||!DIGEST.test(proof.digest||''))return {verified:false};
  try{
   const url='https://api.github.com/repos/'+repository+'/branches/main';
   const response=await fetchImpl(url,{method:'GET',redirect:'error',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+apiToken,'X-GitHub-Api-Version':'2022-11-28'}});
   if(!response?.ok)return {verified:false};
   const branch=await response.json();
   // Exact deployed commit must equal the currently attested main branch head.
   if(branch?.name!=='main'||branch?.commit?.sha!==proof.commit)return {verified:false};
   const canonical=JSON.stringify({repository,branch:'main',commit:proof.commit});
   const hash=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(canonical));
   const digest=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
   if(digest!==proof.digest)return {verified:false};
   return {verified:true,issuer:'github-main',artifactDigest:digest};
  }catch{return {verified:false}}
 };
}
