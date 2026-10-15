import {authorize,respond,method} from '../lib/server-auth.mjs';
import {modelPolicy} from '../lib/limits.mjs';
export default function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const policy=modelPolicy();
 return respond(res,200,{ok:true,policy});
}
