import {listProjectMessages,storeProjectMessage} from './cloudflare-collaboration.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=128&&/^[a-zA-Z0-9_-]+$/.test(x);
async function authorized(request,env){
 const token=env.TEAM_OWNER_API_TOKEN;
 const header=request.headers.get('authorization')||'';
 if(typeof token!=='string'||token.length<32||!header.startsWith('Bearer '))return false;
 const provided=header.slice(7);
 const digest=async v=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
 const a=await digest(token),b=await digest(provided);
 let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
 return diff===0;
}
// Owner-only until true identity/role-based Cloudflare Access replaces this bootstrap gate.
export async function handleOwnerCollaboration(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 const url=new URL(request.url),projectId=url.searchParams.get('projectId');
 if(!valid(projectId))return json({ok:false,error:'invalid_project_id'},400);
 try{
  if(request.method==='GET'){
   const messages=await listProjectMessages(env.TEAM_DB,{projectId,viewer:'owner',limit:50});
   return json({ok:true,projectId,messages});
  }
  if(request.method==='POST'){
   const raw=await request.text();
   if(raw.length>4096)return json({ok:false,error:'payload_too_large'},413);
   let body;try{body=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
   if(typeof body?.message!=='string'||!body.message.trim()||body.message.length>800||!valid(body.persona)||!['project-team','owner-private'].includes(body.visibility))return json({ok:false,error:'invalid_message'},400);
   const kind=body.visibility==='owner-private'?'owner':'update';
   const message={id:crypto.randomUUID(),project:projectId,persona:body.persona,message:body.message.trim(),visibility:body.visibility,kind,state:'draft-not-sent',deliveryConfirmed:false,createdAt:new Date().toISOString()};
   await storeProjectMessage(env.TEAM_DB,message);
   return json({ok:true,id:message.id,deliveryConfirmed:false,state:'draft-not-sent'},201);
  }
  return json({ok:false,error:'method_not_allowed'},405);
 }catch{return json({ok:false,error:'storage_operation_failed'},503)}
}
