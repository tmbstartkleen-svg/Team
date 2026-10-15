const PRIORITY=Object.freeze({microsoft365:100,gmail:20});
export function integrationReadiness(provider,{consented=false,tokenVerified=false,readVerified=false}={}){
 if(!Object.hasOwn(PRIORITY,provider))throw new TypeError('unsupported_provider');
 const connected=Boolean(consented&&tokenVerified&&readVerified);
 return {provider,priority:PRIORITY[provider],connected,monitoringActive:false,readOnlyDefault:true,sendEnabled:false,requiresOwnerApprovalForSend:true,requiredChecks:['interactive-owner-consent','encrypted-server-token-storage','provider-api-read-verification'],verifiedByRuntime:connected};
}
export function rankInboxItems(items){
 if(!Array.isArray(items))throw new TypeError('invalid_inbox');
 return items.map(x=>{if(!x||!Object.hasOwn(PRIORITY,x.provider))throw new TypeError('unsupported_provider');return {...x,priority:PRIORITY[x.provider]}}).sort((a,b)=>b.priority-a.priority);
}
