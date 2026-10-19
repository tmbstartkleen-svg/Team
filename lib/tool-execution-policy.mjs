// Pure preflight authorization for a future tool executor.
// This function never performs an external action, fetches credentials or grants privileges.
const VALID_ID=/^[A-Za-z0-9_.:--]{1,128}$/;
const SAFE_CAPABILITIES=new Set(['read','write','publish','send','delete','purchase']);
export function authorizeToolStep({taskApproved=false, persona, tool, capability, allowedTools=[], grantedCapabilities=[], confirmation=false, idempotencyKey}={}){
 if(typeof persona!=='string'||!VALID_ID.test(persona)||typeof tool!=='string'||!VALID_ID.test(tool)||
    !SAFE_CAPABILITIES.has(capability)||!Array.isArray(allowedTools)||!Array.isArray(grantedCapabilities)||
    allowedTools.length>100||grantedCapabilities.length>20)
  throw new TypeError('invalid_tool_step');
 if(!taskApproved)return {allowed:false,reason:'task_approval_required'};
 if(!allowedTools.includes(tool))return {allowed:false,reason:'tool_not_allowlisted'};
 if(!grantedCapabilities.includes(capability))return {allowed:false,reason:'capability_not_granted'};
 if(capability!=='read'&&confirmation!==true)return {allowed:false,reason:'explicit_confirmation_required'};
 if(capability!=='read'&&(typeof idempotencyKey!=='string'||!VALID_ID.test(idempotencyKey)))
  return {allowed:false,reason:'idempotency_key_required'};
 return {allowed:true,reason:'approved_preflight'};
}
