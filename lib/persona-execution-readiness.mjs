// Provider readiness is distinct from permission to execute a task.
// Never interpret configured credentials or available UI as evidence of inference.
export function assessPersonaExecution(env={}){
 const workersAI=env.TEAM_INFERENCE_PROVIDER==='cloudflare'&&typeof env.AI?.run==='function';
 const modelKey=typeof env.OPENAI_API_KEY==='string'&&env.OPENAI_API_KEY.length>0;
 const allowlist=typeof env.TEAM_ALLOWED_MODELS==='string'&&env.TEAM_ALLOWED_MODELS.trim().length>0;
 const ownerToken=typeof env.TEAM_OWNER_API_TOKEN==='string'&&env.TEAM_OWNER_API_TOKEN.length>=32;
 const database=Boolean(env.TEAM_DB?.prepare);
 return {
  providerConfigured:workersAI||(modelKey&&allowlist),
  ownerAuthConfigured:ownerToken,
  persistentStorageBound:database,
  inferenceVerified:false,
  executorActive:false,
  taskExecutionAllowed:false,
  reason:'live_approved_execution_not_certified',
  requirements:['verified_provider_response','approved_task_claim','durable_execution_receipt','role_scoped_authorization']
 };
}
