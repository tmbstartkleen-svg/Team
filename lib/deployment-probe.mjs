// Public health checks are informational only: they cannot certify private runtime gates.
export async function probeTeamDeployment(url,{fetcher=fetch}={}){
 const target=new URL(url);
 if(target.protocol!=='https:'||target.username||target.password||target.search||target.hash)throw new TypeError('invalid_probe_url');
 if(!['/__team/health','/api/health'].includes(target.pathname))throw new TypeError('unsupported_probe_path');
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetcher(target.href,{method:'GET',redirect:'error',signal:controller.signal,headers:{accept:'application/json'}});
  if(!response.ok)return {reachable:false,operational:false,status:response.status};
  const data=await response.json();
  return {reachable:data?.ok===true,operational:data?.productionOperational===true&&data?.executionConfigured===true&&data?.databaseSchemaVerified===true,hosting:typeof data?.hosting==='string'?data.hosting:'unknown',status:response.status};
 }catch{return {reachable:false,operational:false,status:null}}
 finally{clearTimeout(timer)}
}
