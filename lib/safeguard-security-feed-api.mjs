import {authorized} from './owner-collaboration-api.mjs';
import {emptySafeguardSecurityFeed} from './safeguard-security-feed-projection.mjs';
// Never fetch privileged Safeguard alert/evidence endpoints with the sensor credential.
// This endpoint intentionally remains disconnected pending an independently scoped reader.
export async function handleSafeguardSecurityFeed(request,env){
 const headers={'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'};
 const reply=(payload,status)=>new Response(JSON.stringify(payload),{status,headers});
 if(request.method!=='GET')return reply({ok:false,error:'method_not_allowed'},405);
 if(!await authorized(request,env))return reply({ok:false,error:'unauthorized'},401);
 return reply(emptySafeguardSecurityFeed(),503);
}
