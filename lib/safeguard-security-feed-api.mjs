import {authorized} from './owner-collaboration-api.mjs';
import {readScopedSafeguardExport} from './safeguard-scoped-export-client.mjs';
const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
const reply=(payload,status)=>new Response(JSON.stringify(payload),{status,headers});
// Owner-only and server-to-server. Separate read-only credential, disabled by default.
export async function handleSafeguardSecurityFeed(request,env,{fetcher=fetch}={}){
 if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
 if(!await authorized(request,env))return reply({ok:false,error:'unauthorized'},401);
 const result=await readScopedSafeguardExport({
  enabled:env.ATLAS_SAFEGUARD_SCOPED_READ_ENABLED,
  baseUrl:env.ATLAS_SAFEGUARD_BASE_URL,
  allowedOrigin:env.ATLAS_SAFEGUARD_ALLOWED_ORIGIN,
  token:env.ATLAS_SAFEGUARD_READ_TOKEN,fetcher
 });
 return reply(result,result.ok?200:503);
}
