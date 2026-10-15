import {readiness} from '../lib/readiness.mjs';
import {authorize,respond,method} from '../lib/server-auth.mjs';
export default function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 return respond(res,200,{ok:true,readiness:readiness()});
}
