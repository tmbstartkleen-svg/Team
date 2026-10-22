import {readEdgeStatus} from '../lib/edge-status-relay.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'method_not_allowed'})}
 const result=await readEdgeStatus({origin:process.env.TEAM_CLOUDFLARE_PUBLIC_ORIGIN});
 return res.status(result.status).json({...result,status:undefined});
}
