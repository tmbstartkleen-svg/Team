// Dedicated service-to-service credential, never the owner's browser token.
// The caller must also enforce approval and task-specific authorization.
export async function authorizedExecutor(request,env){
 const secret=env?.TEAM_EXECUTOR_TOKEN;
 const value=request?.headers?.get?.('authorization')||'';
 if(typeof secret!=='string'||secret.length<32||!/^[^\s]+$/.test(secret))return false;
 const match=/^Bearer ([^\s]+)$/i.exec(value);
 if(!match)return false;
 const digest=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 const [a,b]=await Promise.all([digest(secret),digest(match[1])]);
 let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
 return difference===0;
}
