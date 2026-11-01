// Integration policy contract only. No operating-system or network side effects.
// A request body or model output is never a trusted owner approval.
export const CAPABILITIES=Object.freeze({
  'security.alerts.read':{mode:'read',online:false,local:true},
  'security.network.observe':{mode:'read',online:false,local:true},
  'security.scan.authorized':{mode:'external',online:false,local:true},
  'vpn.status.read':{mode:'read',online:false,local:true},
  'vpn.connection.change':{mode:'external',online:false,local:true},
  'browser.navigate':{mode:'external',online:false,local:true},
  'browser.submit':{mode:'submission',online:false,local:true},
  'desktop.app.open':{mode:'external',online:false,local:true},
  'code.workspace.edit':{mode:'local-write',online:false,local:true},
  'code.command.execute':{mode:'external',online:false,local:true},
  'agent.replica.create':{mode:'external',online:false,local:true},
  'agent.update.install':{mode:'external',online:true,local:false},
  'agent.memory.propose':{mode:'local-write',online:false,local:true},
  'agent.memory.promote':{mode:'external',online:false,local:true},
  'assignment.submit':{mode:'submission',online:true,local:false}
});
const ID=/^[a-z0-9][a-z0-9._:-]{0,127}$/;
export function evaluateUnifiedAction({capability,taskId,offline=false,approval=null,executorTrusted=false,scopeAuthorized=false}={}){
 const definition=Object.hasOwn(CAPABILITIES,capability)?CAPABILITIES[capability]:null;
 if(!definition)return {allowed:false,reason:'unknown_capability'};
 if(offline&&!definition.local)return {allowed:false,reason:'unavailable_offline'};
 if(typeof taskId!=='string'||!ID.test(taskId))return {allowed:false,reason:'invalid_task'};
 if(definition.mode==='read')return {allowed:scopeAuthorized===true,reason:scopeAuthorized===true?'read_authorized':'scope_not_authorized'};
 // Proposals may be prepared locally, but no external action is inferred from a proposal.
 if(definition.mode==='local-write')return {allowed:scopeAuthorized===true,reason:scopeAuthorized===true?'local_scope_authorized':'scope_not_authorized'};
 // Integration is not connected to the server's authenticated grant verifier.
 // Even apparently valid caller-supplied approval objects must fail closed.
 return {allowed:false,reason:'trusted_grant_verifier_not_connected'};
}
export function classifyUnifiedCapability(capability){
 const item=Object.hasOwn(CAPABILITIES,capability)?CAPABILITIES[capability]:null;
 return item?{capability,mode:item.mode,offlineAvailable:item.local,requiresExactOwnerApproval:item.mode==='external'||item.mode==='submission'}:null;
}
