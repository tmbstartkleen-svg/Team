import {inspectTeamDatabase} from './d1-readiness.mjs';
import {inspectExecutorSchema} from './executor-schema-readiness.mjs';

// Read-only, non-secret release evidence. Never confuse deployed UI with working agents.
export async function assessLaunchReadiness(env={}) {
 const database=await inspectTeamDatabase(env.TEAM_DB);
 const executorSchema=await inspectExecutorSchema(env.TEAM_DB);
 const workersAI=env.TEAM_INFERENCE_PROVIDER==='cloudflare'&&typeof env.AI?.run==='function';
 const openAI=typeof env.OPENAI_API_KEY==='string'&&env.OPENAI_API_KEY.length>0;
 const modelAllowed=typeof env.TEAM_EXECUTOR_MODEL==='string'&&String(env.TEAM_ALLOWED_MODELS||'').split(',').map(x=>x.trim()).includes(env.TEAM_EXECUTOR_MODEL);
 const checks=[
  {id:'inference-provider-configured',ready:workersAI||(openAI&&modelAllowed),required:true},
  {id:'live-inference-certified',ready:false,required:true},
  {id:'database-binding',ready:database.bindingConfigured,required:true},
  {id:'database-schema',ready:database.schemaVerified,required:true},
  {id:'executor-database-schema',ready:executorSchema.ready,required:true},
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
