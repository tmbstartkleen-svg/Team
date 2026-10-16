import {inspectTeamDatabase} from './d1-readiness.mjs';

// Read-only, non-secret release evidence. Never confuse deployed UI with working agents.
export async function assessLaunchReadiness(env={}) {
 const database=await inspectTeamDatabase(env.TEAM_DB);
 const checks=[
  {id:'database-binding',ready:database.bindingConfigured,required:true},
  {id:'database-schema',ready:database.schemaVerified,required:true},
  {id:'owner-credential',ready:typeof env.TEAM_OWNER_API_TOKEN==='string'&&env.TEAM_OWNER_API_TOKEN.length>=32,required:true},
  {id:'persona-identity',ready:false,required:true},
  {id:'approved-agent-execution',ready:false,required:true},
  {id:'persistent-task-recovery',ready:false,required:true},
  {id:'end-to-end-certification',ready:false,required:true},
  {id:'microsoft365-connection',ready:false,required:false},
  {id:'offline-inference',ready:false,required:false}
 ];
 return {ok:true,service:'atlas-team',hosting:'cloudflare',deploymentReachable:true,productionOperational:false,betaReady:checks.filter(x=>x.required).every(x=>x.ready),checks,verifiedDatabase:database.bindingConfigured&&database.schemaVerified,agentsActive:false};
}
