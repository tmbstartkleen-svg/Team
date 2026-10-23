// Pure, fail-closed preflight for separately approved staging PostgreSQL tests.
// No network, credentials, migrations or database writes.
const NAME=/^[a-z][a-z0-9_]{2,62}$/;
const PRIVATE=/^(localhost|127\.0\.0\.1|::1)$/;
const REJECT=/(prod|production|primary|live|customer|backup)/i;
export function validateJournalStagingConfiguration(env={}) {
  if(env.ATLAS_JOURNAL_STAGING_TEST!=='I_AUTHORIZE_STAGING_WRITES') return {ok:false,reason:'explicit_staging_opt_in_required'};
  const name=env.ATLAS_JOURNAL_STAGING_EXPECTED_DATABASE;
  if(typeof name!=='string'||!NAME.test(name)||!name.includes('staging')||REJECT.test(name))
    return {ok:false,reason:'invalid_staging_database_name'};
  const raw=env.ATLAS_JOURNAL_STAGING_DATABASE_URL;
  if(typeof raw!=='string'||raw.length<16) return {ok:false,reason:'missing_staging_database_url'};
  let parsed;
  try {parsed=new URL(raw)}catch{return {ok:false,reason:'invalid_database_url'}}
  if(!['postgres:','postgresql:'].includes(parsed.protocol)||!parsed.hostname||!parsed.username)
    return {ok:false,reason:'invalid_postgres_connection'};
  if(REJECT.test(parsed.hostname)||REJECT.test(parsed.pathname))
    return {ok:false,reason:'production_like_target'};
  let path;
  try {path=decodeURIComponent(parsed.pathname.replace(/^\//,''))}catch{return {ok:false,reason:'invalid_database_path_encoding'}}
  if(path!==name) return {ok:false,reason:'database_name_url_mismatch'};
  if(parsed.username.includes('%')||parsed.password.includes('%')) return {ok:false,reason:'ambiguous_credential_encoding'};
  if(parsed.searchParams.has('options')||parsed.searchParams.has('service'))
    return {ok:false,reason:'unsupported_connection_override'};
  if(!PRIVATE.test(parsed.hostname)&&parsed.searchParams.get('sslmode')==='disable')
    return {ok:false,reason:'remote_tls_disabled'};
  return {ok:true,expectedDatabase:name};
}
export function validateJournalStagingIdentity(identity,expectedDatabase){
  if(!identity||typeof identity.database_name!=='string'||identity.database_name!==expectedDatabase)
    throw Error('staging_database_identity_mismatch');
  if(REJECT.test(identity.database_name)) throw Error('production_like_database_rejected');
  if(typeof identity.role_name!=='string'||identity.role_name.length<1)
    throw Error('missing_staging_role');
  return true;
}
