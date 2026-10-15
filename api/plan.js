import {authorize,respond,method} from '../lib/server-auth.mjs';
import {buildPlan} from '../lib/orchestration.mjs';
export default function handler(req,res){
 if(!method(req,res,['POST']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{ok:false,error:'json_required'});
 try{return respond(res,200,{ok:true,plan:buildPlan(req.body?.goal,{maxStages:req.body?.maxStages})});}
 catch{return respond(res,400,{ok:false,error:'invalid_plan_request'});}
}
