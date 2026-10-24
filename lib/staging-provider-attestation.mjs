// A provider-verified staging project claim is necessary but never sufficient.
// No network calls, database mutations or execution privileges.
import {checkStagingIsolation} from './staging-isolation-preflight.mjs';
const ID=/^[a-z0-9][a-z0-9-]{5,80}$/;
export function checkStagingProviderAttestation(env={},record={}) {
 const reject=reason=>({ready:false,reason,schemaWriteAuthorized:false,agentExecutionAuthorized:false});
 if(checkStagingIsolation(env).safe!==true)return reject('staging_preflight_failed');
 if(!record||typeof record!=='object'||Array.isArray(record))return reject('attestation_missing');
 // A caller-supplied boolean is not authenticated provider evidence. Require
 // an explicit separate verifier before promoting any claim to readiness.
 if(record.provider!=='neon'||record.environment!=='staging'||record.providerVerified!==true)
  return reject('provider_attestation_unverified');
 if(!ID.test(record.projectId||'')||!ID.test(record.branchId||'')||
    !ID.test(record.roleId||'')||!ID.test(record.productionProjectId||''))
  return reject('resource_identity_missing');
 if(record.projectId===record.productionProjectId)return reject('production_project_reused');
 if(record.isProductionBranch!==false||record.branchIsProtectedProduction===true||record.isEmpty!==true)
  return reject('staging_branch_not_empty_or_isolated');
 if(record.source==='production-clone'||record.containsProductionData!==false)
  return reject('production_data_cannot_be_used');
 if(env.TEAM_STAGING_PROVIDER_PROJECT_ID!==record.projectId)
  return reject('expected_project_mismatch');
 return {ready:false,reason:'provider_identity_requires_independent_verification',
  schemaWriteAuthorized:false,agentExecutionAuthorized:false};
}
