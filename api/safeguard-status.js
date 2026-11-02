import {authorize,respond,method} from '../lib/server-auth.mjs';
import {readSafeguardSnapshot} from '../lib/safeguard-status-client.mjs';
// No write operations; never return configured endpoint, channel, or credentials.
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const result=await readSafeguardSnapshot({
  baseUrl:process.env.ATLAS_SAFEGUARD_BASE_URL,
  allowedOrigin:process.env.ATLAS_SAFEGUARD_ALLOWED_ORIGIN,
  channel:process.env.ATLAS_SAFEGUARD_PUBLIC_CHANNEL
 });
 return respond(res,result.ok?200:503,result);
}
