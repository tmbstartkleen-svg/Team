// Read-only GitHub repository adapter. Tool arguments are sourced from trusted grants.
// No arbitrary URLs, arbitrary methods, redirects to untrusted hosts, or write actions.
const SEGMENT=/^[A-Za-z0-9_.-]{1,100}$/;
export function createGitHubReadAdapter({fetcher,token,allowedRepositories=[]}={}){
 if(typeof fetcher!=='function'||typeof token!=='string'||token.length<8||
    !Array.isArray(allowedRepositories)||!allowedRepositories.length||
    !allowedRepositories.every(x=>typeof x==='string'&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(x)))
  throw new TypeError('github_reader_not_configured');
 const allowed=new Set(allowedRepositories);
 return async function githubRead({signal,step}={}){
  const target=step?.target;
  if(step?.capability!=='read'||step?.tool!=='github.read'||!target||
     !SEGMENT.test(target.owner)||!SEGMENT.test(target.repo)||
     !allowed.has(target.owner+'/'+target.repo)||
     target.resource!=='repository')
   throw new TypeError('github_read_target_not_allowed');
  const url='https://api.github.com/repos/'+encodeURIComponent(target.owner)+'/'+encodeURIComponent(target.repo);
  const response=await fetcher(url,{
   method:'GET',signal,redirect:'error',
   headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'ATLAS-Team-Certification/1.0'}
  });
  if(!response.ok)throw new Error('github_read_failed');
  if(Number(response.headers.get('content-length')||0)>32768)throw new Error('github_read_too_large');
  const raw=await response.text();
  if(raw.length>32768)throw new Error('github_read_too_large');
  let data;try{data=JSON.parse(raw)}catch{throw new Error('github_read_invalid_response')}
  if(data.full_name!==target.owner+'/'+target.repo||!Number.isSafeInteger(data.id)||data.id<=0)
   throw new Error('github_read_unverified_identity');
  return {confirmed:true,receiptId:'github-repo-'+data.id,
   evidence:'GitHub REST repository identity verified for '+data.full_name+'; id '+data.id+'.'};
 };
}
