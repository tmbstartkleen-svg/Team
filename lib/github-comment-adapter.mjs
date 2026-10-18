// Single-purpose GitHub issue-comment adapter for approved external actions.
// No arbitrary URLs, repository mutations, broad scopes, or automatic retries.
// D1 ledger must reserve the idempotency key before this adapter is invoked.
const NAME=/^[A-Za-z0-9_.-]{1,100}$/;
export function createGitHubCommentAdapter({fetcher,token,allowedRepositories=[]}={}){
 if(typeof fetcher!=='function'||typeof token!=='string'||token.length<8||
 !Array.isArray(allowedRepositories)||!allowedRepositories.length||
 !allowedRepositories.every(x=>typeof x==='string'&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(x)))
  throw new TypeError('github_comment_unconfigured');
 const allowed=new Set(allowedRepositories);
 return async ({signal,step}={})=>{
  const target=step?.target;
  if(step?.tool!=='github.issue-comment'||step?.capability!=='send'||!target||
   !NAME.test(target.owner)||!NAME.test(target.repo)||
   !allowed.has(target.owner+'/'+target.repo)||
   !Number.isSafeInteger(target.issueNumber)||target.issueNumber<1||target.issueNumber>999999999||
   typeof target.body!=='string'||target.body.trim().length<8||target.body.length>3000||
   typeof step.idempotencyKey!=='string'||step.idempotencyKey.length<8)
   throw new TypeError('github_comment_target_not_allowed');
  const url='https://api.github.com/repos/'+encodeURIComponent(target.owner)+'/'+encodeURIComponent(target.repo)+
    '/issues/'+target.issueNumber+'/comments';
  const response=await fetcher(url,{method:'POST',signal,redirect:'error',
   headers:{authorization:'Bearer '+token,accept:'application/vnd.github+json',
    'content-type':'application/json','x-github-api-version':'2022-11-28'},
   body:JSON.stringify({body:target.body})});
  if(!response.ok)throw new Error('github_comment_failed');
  if(Number(response.headers.get('content-length')||0)>32768)throw new Error('github_comment_response_too_large');
  const raw=await response.text();
  if(raw.length>32768)throw new Error('github_comment_response_too_large');
  let data;try{data=JSON.parse(raw)}catch{throw new Error('github_comment_invalid_response')}
  if(!Number.isSafeInteger(data.id)||data.id<=0||
    typeof data.html_url!=='string'||
    !data.html_url.startsWith('https://github.com/'+target.owner+'/'+target.repo+'/issues/'))
   throw new Error('github_comment_unverified_receipt');
  return {confirmed:true,receiptId:'github-comment-'+data.id,
   evidence:'GitHub comment '+data.id+' confirmed for '+target.owner+'/'+target.repo+' issue '+target.issueNumber+'.'};
 };
}
