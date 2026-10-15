export const MICROSOFT_SERVICES=Object.freeze([
 {id:'mail',name:'Outlook Mail',scopes:['Mail.Read'],purpose:'Classify actionable incoming email'},
 {id:'calendar',name:'Outlook Calendar',scopes:['Calendars.Read'],purpose:'Identify meetings and deadlines'},
 {id:'tasks',name:'Microsoft To Do',scopes:['Tasks.Read'],purpose:'Review Microsoft To Do tasks'},
 {id:'teams',name:'Microsoft Teams',scopes:['Chat.Read'],purpose:'Review direct Teams conversations'},
 {id:'files',name:'OneDrive and SharePoint',scopes:['Files.Read'],purpose:'Find work documents'}
]);
export const MICROSOFT_BASE_SCOPES=Object.freeze(['openid','profile','offline_access','User.Read']);
export function microsoftConsentPlan(serviceIds=[]){
 if(!Array.isArray(serviceIds)||!serviceIds.every(x=>typeof x==='string'))throw new TypeError('invalid_service_selection');
 const selected=MICROSOFT_SERVICES.filter(s=>serviceIds.includes(s.id));
 if(selected.length!==new Set(serviceIds).size)throw new TypeError('unknown_or_duplicate_service');
 return {provider:'microsoft-entra-id',protocol:'oauth-2.0-authorization-code-pkce',status:'configuration-required',scopes:[...new Set([...MICROSOFT_BASE_SCOPES,...selected.flatMap(s=>s.scopes)])],services:selected.map(({id,name,purpose})=>({id,name,purpose})),requiresInteractiveOwnerConsent:true,tokenStorage:'server-side-only',clientSecretInBrowser:false};
}
