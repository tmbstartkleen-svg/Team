import {safeSafeguardBase} from './safeguard-status-client.mjs';
import {projectAtlasSecurityExport} from './safeguard-atlas-export-contract.mjs';
// Separately scoped read credential: never use Safeguard sensor pairing key.
export async function readScopedSafeguardExport({baseUrl,allowedOrigin,token,enabled,fetcher=fetch}={}){
 if(enabled!=='true')return {ok:false,connected:false,reason:'scoped_read_only_feed_not_configured'};
 const base=safeSafeguardBase(baseUrl),pinned=safeSafeguardBase(allowedOrigin);
 if(!base||!pinned||base!==pinned||typeof token!=='string'||token.length<32||
    token.length>256||!/^[A-Za-z0-9_~.+\/-]+$/.test(token))
  return {ok:false,connected:false,reason:'scoped_read_only_feed_not_configured'};
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),3500);
 try{
  const response=await fetcher(base+'/api/atlas-read',{method:'GET',redirect:'error',
   headers:{authorization:'Bearer '+token,accept:'application/json', 'cache-control':'no-store'},
   signal:controller.signal});
  if(!response?.ok)return {ok:false,connected:false,reason:'upstream_unavailable'};
  if(!String(response.headers?.get?.('content-type')||'').toLowerCase().includes('application/json'))
   return {ok:false,connected:false,reason:'invalid_upstream_response'};
  const length=Number(response.headers?.get?.('content-length'));
  if(Number.isFinite(length)&&length>131072)return {ok:false,connected:false,reason:'invalid_upstream_response'};
  const raw=await response.text();
  if(raw.length>131072)return {ok:false,connected:false,reason:'invalid_upstream_response'};
  const data=JSON.parse(raw);
  return projectAtlasSecurityExport(data);
 }catch{return {ok:false,connected:false,reason:'upstream_unavailable'};}
 finally{clearTimeout(timer);}
}
