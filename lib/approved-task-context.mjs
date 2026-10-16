// Only database-owned task text and persona identity may be sent to an AI provider.
// Prevent a caller from changing an approved task's actual execution instructions.
export async function loadApprovedTaskContext(db,taskId){
 if(!db?.prepare||typeof taskId!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(taskId))throw new TypeError('invalid_task_lookup');
 const row=await db.prepare("SELECT id,title,assigned_persona,state,owner_approved FROM team_tasks WHERE id=?").bind(taskId).first();
 if(!row||row.state!=='queued'||row.owner_approved!==1)return null;
 if(typeof row.title!=='string'||row.title.trim().length<8||row.title.length>1200||typeof row.assigned_persona!=='string'||row.assigned_persona.length<2||row.assigned_persona.length>100)throw new Error('invalid_persisted_task');
 return {taskId:row.id,taskTitle:row.title,persona:row.assigned_persona};
}
