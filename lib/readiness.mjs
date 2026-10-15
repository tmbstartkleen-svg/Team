export function readiness(env=process.env){
 const checks=[
 {id:'operator-secret',ready:Boolean(env.TEAM_ADMIN_TOKEN),required:true},
 {id:'dedicated-database',ready:Boolean(env.TEAM_DATABASE_URL),required:true},
 {id:'ai-provider-key',ready:Boolean(env.OPENAI_API_KEY),required:true},
 {id:'model-allowlist',ready:Boolean((env.TEAM_ALLOWED_MODELS||'').trim()),required:true},
 {id:'offline-runtime',ready:false,required:false},
 {id:'enterprise-identity',ready:false,required:false}
 ];
 return {operational:checks.filter(c=>c.required).every(c=>c.ready),checks,externalExecution:'disabled',offlineInference:'not-installed'};
}
