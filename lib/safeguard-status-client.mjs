import {projectSnapshot} from './safeguard-readonly-projection.mjs';
// ATLAS-only read adapter. Never accept a remote URL/channel from request input.
export function safeSafeguardBase(value){
 if(typeof value!=='string'||!value)return null;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||url.port)return null;
  const host=url.hostname.toLowerCase();
  if(host==='localhost'||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal')||host==='127.0.0.1'||host==='0.0.0.0'||host==='[::1]')return null;
  if(!/^[a-z0-9.-]+$/.test(host)||!host.includes('.'))return null;
  if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(host))return null;
  return url.origin;
 }catch{return null;}
}
async function fetchJSON(url,fetcher,signal){
 const response=await fetcher(url,{method:'GET',redirect:'error',headers:{Accept:'application/json'},signal});
 if(!response?.ok)throw new Error('upstream_unavailable');
 const mime=response.headers?.get?.('content-type')||'';
 if(!mime.toLowerCase().includes('application/json'))throw new Error('invalid_upstream_content_type');
 const len=Number(response.headers?.get?.('content-length'));
 if(Number.isFinite(len)&&len>16384)throw new Error('upstream_response_too_large');
 const data=await response.json();
 if(JSON.stringify(data).length>16384)throw new Error('upstream_response_too_large');
 return data;
}
export async function readSafeguardSnapshot({baseUrl,channel,fetcher=fetch,timeoutMs=3500}={}){
 const base=safeSafeguardBase(baseUrl);
 if(!base||typeof channel!=='string'||!/^[-_a-zA-Z0-9]{1,128}$/.test(channel))
  return {ok:false,error:'safeguard_adapter_not_configured'};
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),Math.min(5000,Math.max(500,timeoutMs)));
 try{
  const health=await fetchJSON(base+'/api/health',fetcher,controller.signal);
  const sensor=await fetchJSON(base+'/api/agent/public-status?channel='+encodeURIComponent(channel),fetcher,controller.signal);
  const snapshot=projectSnapshot({health,sensor});
  return {ok:snapshot.health.ok&&snapshot.sensor.ok, ...snapshot};
 }catch{
  return {ok:false,error:'safeguard_status_unavailable',source:'safeguard',mode:'read-only'};
 }finally{clearTimeout(timer);}
}
