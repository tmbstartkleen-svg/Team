import {readiness} from '../lib/readiness.mjs';
// Preview-only report of configuration checks, never evidence of production
// execution certification, authorization, or applied migrations.
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'method_not_allowed'});}
 const state=readiness();
 return res.status(200).json({ok:true,environment:process.env.VERCEL_ENV||'unknown',
  checks:state.checks.map(({id,ready,required})=>({id,ready,required})),
  configurationReady:state.operational,productionOperational:false,
  betaReady:false,executionCertified:false,
  message:'Read-only preview checks are not operational certification'});
}
