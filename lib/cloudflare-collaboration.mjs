// Cloudflare D1 collaboration repository. Caller must authenticate identity first.
// No public endpoint should expose these functions without server-side owner/persona authorization.
export async function listProjectMessages(db,{projectId,viewer,limit=50}){
 if(!db?.prepare||typeof projectId!=='string'||!projectId.trim()||!['owner','persona'].includes(viewer))throw new TypeError('invalid_message_query');
 const n=Math.min(100,Math.max(1,Number.isInteger(limit)?limit:50));
 const statement=viewer==='owner'
  ?db.prepare('SELECT id,project_id,task_id,persona,visibility,kind,body,created_at FROM team_messages WHERE project_id=? ORDER BY created_at DESC,id DESC LIMIT ?')
  :db.prepare("SELECT id,project_id,task_id,persona,visibility,kind,body,created_at FROM team_messages WHERE project_id=? AND visibility='project-team' ORDER BY created_at DESC,id DESC LIMIT ?");
 const result=await statement.bind(projectId,n).all();
 return result.results||[];
}
export async function storeProjectMessage(db,message){
 if(!db?.prepare||!message||message.state!=='draft-not-sent'||message.deliveryConfirmed!==false||!['owner-private','project-team'].includes(message.visibility)||!['update','question','handoff','blocked','owner'].includes(message.kind))throw new TypeError('invalid_message');
 if(message.visibility!==(message.kind==='owner'?'owner-private':'project-team'))throw new TypeError('invalid_visibility');
 if(typeof message.id!=='string'||typeof message.project!=='string'||typeof message.persona!=='string'||typeof message.message!=='string'||message.message.length>800)throw new TypeError('invalid_message_fields');
 return db.prepare('INSERT INTO team_messages(id,project_id,task_id,persona,visibility,kind,body,created_at) VALUES(?,?,?,?,?,?,?,?)')
 .bind(message.id,message.project,message.taskId||null,message.persona,message.visibility,message.kind,message.message,message.createdAt).run();
}
