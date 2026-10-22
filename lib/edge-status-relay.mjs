// Browser-safe, GET-only Cloudflare status relay. No owner credentials or mutations.
// The configured upstream must be an operator-controlled HTTPS origin; never use
// a request-supplied URL. Results are diagnostic, not a certification receipt.
const PATHS=Object.freeze({
 health:'/api/health',
 launch:'/api/launch-readiness',
 personas:'/api/persona-execution-readiness',
 database:'/api/database-readiness'
});
export async function readEdgeStatus({origin,fetchImpl=globalThis.fetch}={}){
 if(typeof origin!=='string'||typeof fetchImpl!=='function')return {ok:false,error:'edge_origin_not_configured',status:503};
 let upstream;
 try{
  upstream=new URL(origin);
  if(upstream.protocol!=='https:'||upstream.username||upstream.password||upstream.pathname!=='/'||upstream.search||upstream.hash
    ||!upstream.hostname.endsWith('.workers.dev'))return {ok:false,error:'invalid_edge_origin',status:503};
 }catch{return {ok:false,error:'invalid_edge_origin',status:503}}
 const results={};
 for(const [name,path] of Object.entries(PATHS)){
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),5000);
  try{
   const res=await fetchImpl(new URL(path,upstream).toString(),{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',signal:abort.signal,headers:{accept:'application/json'}});
   if(!res.ok||!(res.headers.get('content-type')||'').includes('application/json'))throw Error('unavailable');
   const body=await res.json();
   results[name]={reachable:true,reportedOk:body?.ok===true,
    ...(name==='health'?{service:body?.service=== 'atlas-team'?'atlas-team':'unverified',productionOperational:body?.productionOperational===true}:{} )};
  }catch{results[name]={reachable:false,reportedOk:false}}
  finally{clearTimeout(timeout)}
 }
 return {ok:results.health?.reachable===true,source:'cloudflare-public-read-only',certified:false,checks:results,status:results.health?.reachable?200:503};
}
