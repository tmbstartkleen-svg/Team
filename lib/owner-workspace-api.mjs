// Strictly read-only workspace bootstrap; authentication is always checked in the Worker.
import {authorized} from './owner-collaboration-api.mjs';
import {listProjectMessages} from './cloudflare-collaboration.mjs';
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function handleOwnerWorkspace(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 try{
  const p=await env.TEAM_DB.prepare('SELECT id,title,status,created_at FROM team_projects ORDER BY created_at DESC LIMIT 100').all();
  const projects=p.results||[];
  const url=new URL(request.url),projectId=url.searchParams.get('projectId');
  if(projectId&&!/^[a-zA-Z0-9_-]{1,128}$/.test(projectId))return json({ok:false,error:'invalid_project_id'},400);
  const messages=projectId?await listProjectMessages(env.TEAM_DB,{projectId,viewer:'owner',limit:50}):[];
  return json({ok:true,projects,messages,projectId:projectId||null,source:'cloudflare-d1',agentExecutionActive:false});
 }catch{return json({ok:false,error:'workspace_query_failed'},503)}
}
