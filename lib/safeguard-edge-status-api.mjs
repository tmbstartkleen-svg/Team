import {authorized} from './owner-collaboration-api.mjs';
import {readSafeguardSnapshot} from './safeguard-status-client.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
// Cloudflare version of the owner-only, read-only Safeguard status adapter.
// Uses TEAM_OWNER_API_TOKEN authentication already enforced by other owner endpoints.
export async function handleSafeguardEdgeStatus(request,env,{fetcher=fetch}={}){
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 const snapshot=await readSafeguardSnapshot({
  baseUrl:env.ATLAS_SAFEGUARD_BASE_URL,
  allowedOrigin:env.ATLAS_SAFEGUARD_ALLOWED_ORIGIN,
  channel:env.ATLAS_SAFEGUARD_PUBLIC_CHANNEL,
  fetcher
 });
 return json(snapshot,snapshot.ok?200:503);
}
