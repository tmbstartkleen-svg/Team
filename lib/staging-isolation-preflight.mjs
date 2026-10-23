// Staging must use a separately provisioned database and identity.
// This check never connects to a database or reveals credentials.
export function checkStagingIsolation(env={}) {
 const fail=reason=>({safe:false,reason,mayRunStagingTests:false});
 if(env.VERCEL_ENV!=='preview')return fail('not_preview_environment');
 if(env.TEAM_STAGING_TESTS_ENABLED!=='true')return fail('staging_tests_not_enabled');
 const stage=env.TEAM_DATABASE_URL;
 // Preview needs only a non-secret production host reference, never its password.
 const productionHost=env.TEAM_PRODUCTION_DATABASE_HOST;
 if(typeof stage!=='string'||!stage)return fail('staging_database_missing');
 if(typeof productionHost!=='string'||!productionHost)return fail('production_database_host_reference_missing');
 if(env.TEAM_PRODUCTION_DATABASE_URL)return fail('production_database_credentials_in_preview');
 let a;
 try{a=new URL(stage)}catch{return fail('invalid_database_url')}
 if(!['postgres:','postgresql:'].includes(a.protocol))return fail('invalid_database_protocol');
 if(!a.hostname||!a.pathname||a.pathname==='/')return fail('database_identity_missing');
 if(!/^[a-z0-9.-]+$/i.test(productionHost)||productionHost.includes('..'))return fail('invalid_production_hostname');
 // A different host is only a preliminary guard, not provider-backed proof.
 if(a.hostname.toLowerCase()===productionHost.toLowerCase())return fail('shared_database_host');
 if(!env.TEAM_STAGING_INSTANCE_ID||!/^atlas-staging-[a-z0-9-]{8,64}$/.test(env.TEAM_STAGING_INSTANCE_ID))
  return fail('dedicated_staging_instance_unverified');
 return {safe:true,reason:'isolation_preflight_only',mayRunStagingTests:false};
}
