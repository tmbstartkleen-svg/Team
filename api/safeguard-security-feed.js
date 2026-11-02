import {authorize,respond,method} from '../lib/server-auth.mjs';
import {emptySafeguardSecurityFeed} from '../lib/safeguard-security-feed-projection.mjs';
// Deliberately disconnected until Safeguard provides scoped owner read-only credentials.
export default function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 return respond(res,503,emptySafeguardSecurityFeed());
}
