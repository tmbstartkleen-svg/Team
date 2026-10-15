import {randomBytes,createHash} from 'node:crypto';
import {microsoftConsentPlan} from './microsoft-365.mjs';
import {microsoftConnectionReadiness} from './microsoft-readiness.mjs';
const b64=b=>b.toString('base64url');
export function createMicrosoftSignIn({env={},services=['mail','calendar','tasks','teams']}={}){
 const ready=microsoftConnectionReadiness(env);
 if(!ready.configured)throw new Error('microsoft_app_not_configured');
 const redirect=new URL(env.TEAM_MS_REDIRECT_URI);
 if(redirect.protocol!=='https:'||redirect.username||redirect.password||redirect.hash)throw new Error('invalid_redirect_uri');
 const state=b64(randomBytes(32)),verifier=b64(randomBytes(64));
 const challenge=b64(createHash('sha256').update(verifier).digest());
 const consent=microsoftConsentPlan(services);
 const authorize=new URL('https://login.microsoftonline.com/'+encodeURIComponent(env.TEAM_MS_TENANT_ID)+'/oauth2/v2.0/authorize');
 authorize.searchParams.set('client_id',env.TEAM_MS_CLIENT_ID);
 authorize.searchParams.set('response_type','code');
 authorize.searchParams.set('redirect_uri',redirect.toString());
 authorize.searchParams.set('response_mode','query');
 authorize.searchParams.set('scope',consent.scopes.join(' '));
 authorize.searchParams.set('state',state);
 authorize.searchParams.set('code_challenge',challenge);
 authorize.searchParams.set('code_challenge_method','S256');
 return {authorizationUrl:authorize.toString(),state,verifier,expiresInSeconds:600,requiresServerSideOneTimeSession:true};
}
