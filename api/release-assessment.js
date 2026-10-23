import {readEdgeStatus} from '../lib/edge-status-relay.mjs';
import {checkStagingDatabase} from '../lib/staging-db-check.mjs';
import {resolveDatabaseUrl} from '../lib/database-url.mjs';
import {readiness} from '../lib/readiness.mjs';
import {assessAtlasReadiness} from '../lib/operational-release-assessment.mjs';
// Read-only release assessment; never grants production approval or certifies agents.
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'method_not_allowed'});}
 res.setHeader('Cache-Control','no-store');
 const state=readiness();
 const [db,edge]=await Promise.all([
  checkStagingDatabase(),readEdgeStatus({origin:process.env.TEAM_CLOUDFLARE_PUBLIC_ORIGIN})
 ]);
 const health={
  environment:process.env.VERCEL_ENV==='preview'?'preview':process.env.VERCEL_ENV==='production'?'production':'unknown',
  productionOperational:false,
  releaseCommit:process.env.VERCEL_GIT_COMMIT_SHA?.slice(0,12)||null,
  executionConfigured:false,
  stagingDatabase:{connected:db.connected,schemaReady:db.schemaReady},
  capabilities:{modelExecution:process.env.TEAM_MODEL_EXECUTION_ENABLED==='true'?'configured-not-verified':'disabled',autonomousAgents:false},
  releaseChecks:{liveWorkflowVerified:false,minimumConfigurationPresent:state.operational},
  edge:{certified:false,ok:edge.ok}
 };
 const assessment=assessAtlasReadiness(health);
 return res.status(200).json({ok:true,...assessment,source:'live_read_only',noTaskWrites:true});
}
