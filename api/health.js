import {readEdgeStatus} from '../lib/edge-status-relay.mjs';
import {readiness} from '../lib/readiness.mjs';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'method_not_allowed'});}
 res.setHeader('Cache-Control','no-store');
 const state=readiness();
 const edge=await readEdgeStatus({origin:process.env.TEAM_CLOUDFLARE_PUBLIC_ORIGIN});
 const configured=Boolean(process.env.TEAM_ADMIN_TOKEN&&process.env.OPENAI_API_KEY&&process.env.TEAM_DATABASE_URL);
 return res.status(200).json({
  ok:true,service:'atlas-team',version:'0.33.0',releaseCommit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)||null,executionConfigured:configured,
  modelConfigured:Boolean(process.env.OPENAI_API_KEY),accessConfigured:Boolean(process.env.TEAM_ADMIN_TOKEN),
  mode:'approval-gated-server',edge:{ok:edge.ok,source:edge.source||'unconfigured',certified:false,checks:edge.checks||{}},
  environment:process.env.VERCEL_ENV==='production'?'production':process.env.VERCEL_ENV==='preview'?'preview':'unknown',
  configuration:{operatorSecretPresent:Boolean(process.env.TEAM_ADMIN_TOKEN),databaseUrlPresent:Boolean(process.env.TEAM_DATABASE_URL),modelKeyPresent:Boolean(process.env.OPENAI_API_KEY),modelAllowlistPresent:Boolean((process.env.TEAM_ALLOWED_MODELS||'').trim())},
  productionOperational:false,
  capabilities:{
   taskRouting:'local',taskApprovals:process.env.TEAM_DATABASE_URL?'server-available-if-schema-ready':'browser-local',
   modelExecution:configured?'configured-not-verified':'disabled',
   persistentStorage:Boolean(process.env.TEAM_DATABASE_URL),
   databaseSchemaVerified:false,offlineInference:false,autonomousAgents:false
  },
  releaseChecks:{minimumConfigurationPresent:state.operational,liveWorkflowVerified:false}
 });
}
