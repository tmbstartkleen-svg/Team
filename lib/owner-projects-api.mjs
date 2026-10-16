import {authorized} from './owner-collaboration-api.mjs';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const validId=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,128}$/.test(x);
export async function handleOwnerProjects(request,env){
 if(!await authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(!env.TEAM_DB?.prepare)return json({ok:false,error:'database_not_connected'},503);
 try{
  if(request.method==='GET'){
   const r=await env.TEAM_DB.prepare('SELECT id,title,status,created_at FROM team_projects ORDER BY created_at DESC LIMIT 100').all();
   return json({ok:true,projects:r.results||[]});
  }
  if(request.method==='POST'){
   const raw=await request.text();
   if(raw.length>2048)return json({ok:false,error:'payload_too_large'},413);
   let body;try{body=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
   if(!validId(body?.id)||typeof body?.title!=='string'||!body.title.trim()||body.title.length>160)return json({ok:false,error:'invalid_project'},400);
   const found=await env.TEAM_DB.prepare('SELECT id FROM team_projects WHERE id=?').bind(body.id).first();
   if(found)return json({ok:false,error:'project_exists'},409);
   await env.TEAM_DB.prepare('INSERT INTO team_projects (id,title,status) VALUES (?,?,?)').bind(body.id,body.title.trim(),'active').run();
   return json({ok:true,id:body.id,status:'active'},201);
  }
  return json({ok:false,error:'method_not_allowed'},405);
 }catch{return json({ok:false,error:'database_operation_failed'},503)}
}
