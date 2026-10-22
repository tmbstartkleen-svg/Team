import {buildProductionSignedAttestationReader} from './production-signed-attestation-source.mjs';
// Read-only diagnostics for release operators. Never executes certification.
// Configuration flags and CI success do not substitute for authenticated events.
export function createProductionEvidencePreflight(env={},runtime={}){
 const inspect=buildProductionSignedAttestationReader(env,runtime);
 return async function preflight(proof){
  if(!proof||typeof proof!=='object')return {ready:false,verified:false,reason:'invalid_scope'};
  if(env.TEAM_SIGNED_ATTESTATION_READ_ENABLED!=='true')
   return {ready:false,verified:false,reason:'source_disabled'};
  if(!env.TEAM_DB?.prepare)return {ready:false,verified:false,reason:'database_unavailable'};
  try{
   const result=await inspect(proof);
   return {ready:result?.verified===true,verified:result?.verified===true,
    reason:result?.verified===true?'verified_evidence':'not_independently_certified'};
  }catch{return {ready:false,verified:false,reason:'read_failed'}}
 };
}
