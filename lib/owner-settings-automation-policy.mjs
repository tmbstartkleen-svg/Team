// Pure authorization contract for settings and scheduled automation.
// This module does not invoke tools, mutate settings, or create schedules.
// No request body, model output, or browser flag is evidence of an owner grant.
const ACTIONS=Object.freeze({
 'settings.read':{kind:'read'},
 'settings.change':{kind:'mutation'},
 'settings.credentials.rotate':{kind:'sensitive'},
 'automation.inspect':{kind:'read'},
 'automation.create':{kind:'mutation'},
 'automation.pause':{kind:'mutation'},
 'automation.resume':{kind:'mutation'},
 'automation.delete':{kind:'sensitive'},
 'email.draft':{kind:'read'},
 'email.send':{kind:'sensitive'},
 'browser.navigate':{kind:'mutation'},
 'browser.submit':{kind:'sensitive'},
 'computer.files.read':{kind:'read'},
 'computer.files.change':{kind:'sensitive'}
});
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const sensitive=new Set(['settings.credentials.rotate','automation.delete','email.send','browser.submit','computer.files.change']);
export function classifyOwnerOperation(action){
 const item=Object.hasOwn(ACTIONS,action)?ACTIONS[action]:null;
 return item?{action,kind:item.kind,requiresExecutionReceipt:item.kind!=='read',requiresExplicitConfirmation:item.kind==='sensitive'}:null;
}
export function evaluateOwnerOperation({
 action,target,requesterAuthenticated=false,toolConnected=false,
 persistedGrant=null,now=Date.now(),confirmation=false
}={}){
 const operation=classifyOwnerOperation(action);
 if(!operation)return {allowed:false,reason:'unknown_operation'};
 if(!ID.test(target||''))return {allowed:false,reason:'invalid_target'};
 if(requesterAuthenticated!==true)return {allowed:false,reason:'owner_authentication_required'};
 if(toolConnected!==true)return {allowed:false,reason:'tool_not_connected'};
 if(!persistedGrant||typeof persistedGrant!=='object'||Array.isArray(persistedGrant)||
  persistedGrant.trustedSource!=='server-verified'||
  persistedGrant.revoked===true||
  persistedGrant.action!==action||
  persistedGrant.target!==target||
  typeof persistedGrant.expiresAt!=='string'||
  !Number.isFinite(Date.parse(persistedGrant.expiresAt))||
  Date.parse(persistedGrant.expiresAt)<=now||
  !ID.test(persistedGrant.grantId||''))
  return {allowed:false,reason:'trusted_scoped_grant_required'};
 if(sensitive.has(action)&&(persistedGrant.explicitConfirmation!==true||confirmation!==true))
  return {allowed:false,reason:'explicit_confirmation_required'};
 if(operation.kind!=='read'&&(!ID.test(persistedGrant.idempotencyKey||'')||
  persistedGrant.receiptRequired!==true))
  return {allowed:false,reason:'durable_receipt_required'};
 return {allowed:true,reason:'verified_owner_grant',requiresReceipt:operation.requiresExecutionReceipt};
}
export function validateAutomationPlan(plan={}){
 if(!plan||typeof plan!=='object'||Array.isArray(plan))return {ok:false,reason:'invalid_plan'};
 const {id,action,target,intervalMinutes,maxRuns,enabled}=plan;
 if(!ID.test(id||'')||!classifyOwnerOperation(action)||!ID.test(target||'')||
  !Number.isSafeInteger(intervalMinutes)||intervalMinutes<15||intervalMinutes>525600||
  !Number.isSafeInteger(maxRuns)||maxRuns<1||maxRuns>1000||enabled!==false)
  return {ok:false,reason:'invalid_plan'};
 // New plans stay disabled; owner enrollment requires a separate verified grant.
 return {ok:true,executionEnabled:false,requiresPersistedGrant:true};
}
