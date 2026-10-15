import {randomUUID} from 'node:crypto';
import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
import {SPECIALISTS} from '../lib/route.mjs';
const priorities=new Set(['low','medium','high','critical']);
export default async function handler(req,res){
 if(!method(req,res,['GET','POST']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 if(req.method==='POST'&&!String(req.headers['content-type']||'').startsWith('application/json'))return respond(res,415,{ok:false,error:'json_required'});
 const result=await withDb(async db=>{
  if(req.method==='GET'){
   const rows=await db.query('SELECT id,title,persona,priority,status,approval,created_at,approved_at FROM team_tasks ORDER BY created_at DESC LIMIT 100');
   return {ok:true,tasks:rows.rows};
  }
  const {title,persona,priority='medium'}=req.body||{};
  if(typeof title!=='string'||title.trim().length<3||title.length>240)return {ok:false,error:'invalid_title',status:400};
  if(!SPECIALISTS.some(x=>x.name===persona))return {ok:false,error:'invalid_persona',status:400};
  if(!priorities.has(priority))return {ok:false,error:'invalid_priority',status:400};
  const id=randomUUID();
  await db.query('BEGIN');
  try{
   await db.query('INSERT INTO team_tasks(id,title,persona,priority) VALUES ($1,$2,$3,$4)',[id,title.trim(),persona,priority]);
   await db.query('INSERT INTO team_events(task_id,event_type,details) VALUES($1,$2,$3)',[id,'task.created',JSON.stringify({persona,priority})]);
   await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');throw e}
  return {ok:true,task:{id,title:title.trim(),persona,priority,status:'queued',approval:'pending'},status:201};
 });
 return respond(res,result.status||200,{...result,status:undefined});
}
