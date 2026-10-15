import {MICROSOFT_SERVICES,microsoftConsentPlan} from './microsoft-365.mjs';
export function microsoftConnectionReadiness(env={}){
 const appId=typeof env.TEAM_MS_CLIENT_ID==='string'&&/^[0-9a-f-]{36}$/i.test(env.TEAM_MS_CLIENT_ID);
 const tenant=typeof env.TEAM_MS_TENANT_ID==='string'&&(/^[0-9a-f-]{36}$/i.test(env.TEAM_MS_TENANT_ID)||env.TEAM_MS_TENANT_ID==='organizations');
 const redirect=typeof env.TEAM_MS_REDIRECT_URI==='string'&&env.TEAM_MS_REDIRECT_URI.startsWith('https://');
 return {configured:Boolean(appId&&tenant&&redirect),clientIdConfigured:Boolean(appId),tenantConfigured:Boolean(tenant),redirectConfigured:Boolean(redirect),connected:false,monitoringActive:false,requiredSetup:['Register Microsoft Entra application','Configure HTTPS redirect URI','Implement server-side OAuth PKCE callback and encrypted tokens','Obtain owner consent for read permissions','Verify Graph access before enabling monitors'],services:MICROSOFT_SERVICES.map(({id,name})=>({id,name,status:'not-connected'})),exampleConsent:microsoftConsentPlan(['mail','calendar','tasks','teams','files']).scopes};
}
