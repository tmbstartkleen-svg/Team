export const ACCESS_MODES=Object.freeze(['observer','approval','delegated','full']);
export const SENSITIVE_ACTIONS=Object.freeze(['spend','grant-access','share-data','delete-records','create-replica']);
export function evaluateAccess({mode='approval',action,scopes=[],expiresAt=null,now=Date.now(),revoked=false,ownerApproved=false}={}){
 if(!ACCESS_MODES.includes(mode))return {allowed:false,reason:'invalid_mode'};
 if(revoked)return {allowed:false,reason:'access_revoked'};
 if(expiresAt!==null&&(!Number.isFinite(Date.parse(expiresAt))||Date.parse(expiresAt)<=now))return {allowed:false,reason:'expired_grant'};
 if(typeof action!=='string'||!action.trim())return {allowed:false,reason:'invalid_action'};
 const readOnly=['research','analyze','draft','recommend','view-email','view-tasks','view-calendar','view-teams'];
 if(readOnly.includes(action))return {allowed:true,reason:'read_only'};
 if(mode==='observer')return {allowed:false,reason:'observer_read_only'};
 if(mode==='approval')return {allowed:ownerApproved,reason:ownerApproved?'owner_approved':'awaiting_owner_approval'};
 if(!scopes.includes(action))return {allowed:false,reason:'scope_not_granted'};
 if(SENSITIVE_ACTIONS.includes(action)&&!ownerApproved)return {allowed:false,reason:'sensitive_action_requires_approval'};
 return {allowed:true,reason:'within_owner_grant'};
}
