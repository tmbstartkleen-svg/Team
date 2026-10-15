export const MAX_TASK_CHARS=240;
export const MAX_OUTPUT_TOKENS=1200;
export const MODEL_TIMEOUT_MS=23000;
export function modelPolicy(env=process.env){
 const models=String(env.TEAM_ALLOWED_MODELS||'gpt-5-mini').split(',').map(v=>v.trim()).filter(Boolean);
 const model=env.TEAM_MODEL||'gpt-5-mini';
 return {model,allowed:models.includes(model),models,maxOutputTokens:MAX_OUTPUT_TOKENS,timeoutMs:MODEL_TIMEOUT_MS,
  providerConfigured:Boolean(env.OPENAI_API_KEY),quotaConfigured:Boolean(env.TEAM_MONTHLY_BUDGET_USD)};
}
