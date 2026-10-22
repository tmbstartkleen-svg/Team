// Staging must use a separately provisioned database and identity.
// This check never connects to a database or reveals credentials.
export function checkStagingIsolation(env={}) {
 const fail=reason=>({safe:false,reason,mayRunStagingTests:false});
 if(env.VERCEL_ENV!=='preview')return fail('not_preview_environment');
 if(env.TEAM_STAGING_TESTS_ENABLED!=='true')return fail('staging_tests_not_enabled');
 const stage=env.TEAM_DATABASE_URL,production=env.TEAM_PRODUCTION_DATABASE_URL;
 if(typeof stage!=='string'||!stage)return fail('staging_database_missing');
 if(typeof production!=='string'||!production)return fail('production_database_reference_missing');
 let a,p;
 try{a=new URL(stage);p=new URL(production)}catch{return fail('invalid_database_url')}
 if(!['postgres:','postgresql:'].includes(a.protocol)||!['postgres:','postgresql:'].includes(p.protocol))
  return fail('invalid_database_protocol');
 if(!a.hostname||!p.hostname||!a.pathname||a.pathname==='/')return fail('database_identity_missing');
 const identity=u=>[u.hostname.toLowerCase(),u.port||'5432',decodeURIComponent(u.pathname),decodeURIComponent(u.username)].join('|');
 if(identity(a)===identity(p))return fail('production_database_identity');
 if(!env.TEAM_STAGING_INSTANCE_ID||!/^atlas-staging-[a-z0-9-]{8,64}$/.test(env.TEAM_STAGING_INSTANCE_ID))
  return fail('dedicated_staging_instance_unverified');
 return {safe:true,reason:'isolation_preflight_only',mayRunStagingTests:false};
}
