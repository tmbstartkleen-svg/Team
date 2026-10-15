import {randomUUID} from 'node:crypto';
const KINDS=new Set(['update','question','handoff','blocked','owner']);
export function createProjectMessage(input){
 if(!input||typeof input!=='object')throw new TypeError('invalid_message');
 const {project,persona,message,kind='update',taskId=null}=input;
 if(typeof project!=='string'||!project.trim()||project.length>80||typeof persona!=='string'||!persona.trim()||persona.length>80||typeof message!=='string'||!message.trim()||message.length>800||!KINDS.has(kind))throw new TypeError('invalid_message');
 if(taskId!==null&&(typeof taskId!=='string'||taskId.length>100))throw new TypeError('invalid_task_reference');
 return {id:randomUUID(),project:project.trim(),persona:persona.trim(),message:message.trim(),kind,taskId,visibility:kind==='owner'?'owner-private':'project-team',state:'draft-not-sent',createdAt:new Date().toISOString(),deliveryConfirmed:false};
}
export function projectRoomView(messages,{project,viewer='persona'}={}){
 if(typeof project!=='string'||!project.trim()||!['persona','owner'].includes(viewer)||!Array.isArray(messages))throw new TypeError('invalid_query');
 return messages.filter(m=>m.project===project&&(viewer==='owner'||m.visibility==='project-team')).map(m=>({...m}));
}
