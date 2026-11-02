import {authorize,respond,method} from '../lib/server-auth.mjs';
import {readiness} from '../lib/readiness.mjs';
import {readSafeguardSnapshot} from '../lib/safeguard-status-client.mjs';
import {emptySafeguardSecurityFeed} from '../lib/safeguard-security-feed-projection.mjs';
// Vercel Hobby: consolidated read-only diagnostics. Original public paths are rewrites.
// Fail closed on unexpected paths; never relay the sensor key or raw evidence.
const allowed=new Set(['/api/readiness','/api/safeguard-status','/api/safeguard-security-feed']);
export default async function handler(req,res){
 const path=new URL(req.url||'/', 'https://atlas.invalid').pathname;
 // The private dispatch header is set only by server-side rewrite configuration.
 const route=(req.headers['x-atlas-diagnostic-route']||'').toString();
 const selected=allowed.has(route)?route:path;
 if(!allowed.has(selected))return respond(res,404,{ok:false,error:'not_found'});
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 if(selected==='/api/readiness')return respond(res,200,{ok:true,readiness:readiness()});
 if(selected==='/api/safeguard-security-feed')return respond(res,503,emptySafeguardSecurityFeed());
 const result=await readSafeguardSnapshot({
  baseUrl:process.env.ATLAS_SAFEGUARD_BASE_URL,
  allowedOrigin:process.env.ATLAS_SAFEGUARD_ALLOWED_ORIGIN,
  channel:process.env.ATLAS_SAFEGUARD_PUBLIC_CHANNEL
 });
 return respond(res,result.ok?200:503,result);
}
