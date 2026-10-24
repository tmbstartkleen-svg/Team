import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import tasks from '../api/tasks.js';
import approve from '../api/approve.js';
function response(){return {code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
const keys=['VERCEL_ENV','TEAM_ADMIN_TOKEN','TEAM_DATABASE_URL','DATABASE_URL','TEAM_MODEL_EXECUTION_ENABLED'];
function save(){return Object.fromEntries(keys.map(k=>[k,process.env[k]]))}
function restore(old){for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
test('authenticated task creation then one approval is atomic, audited, and not executed',async()=>{
 const old=save(),connect=pg.Pool.prototype.connect;
 const state={task:null,events:[],transactions:[]};
 try{
  process.env.VERCEL_ENV='preview';process.env.TEAM_ADMIN_TOKEN='synthetic-atlas-staging-token';
  process.env.TEAM_DATABASE_URL='postgresql://synthetic.invalid/atlas';delete process.env.DATABASE_URL;
  delete process.env.TEAM_MODEL_EXECUTION_ENABLED;
  pg.Pool.prototype.connect=async function(){return {release(){},query:async(sql,params=[])=>{
   if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)){state.transactions.push(sql);return {rows:[],rowCount:0}}
   if(sql.includes('INSERT INTO team_tasks')){
    state.task={id:params[0],title:params[1],persona:params[2],priority:params[3],status:'queued',approval:'pending'};
    return {rows:[],rowCount:1};
   }
   if(sql.includes("UPDATE team_tasks SET approval=")){
    if(!state.task||state.task.id!==params[1]||state.task.approval!=='pending'||state.task.status!=='queued')return {rows:[],rowCount:0};
    state.task.approval=params[0];return {rows:[{id:state.task.id,approval:state.task.approval,status:state.task.status}],rowCount:1};
   }
   if(sql.includes('INSERT INTO team_events')){state.events.push({taskId:params[0],eventType:params[1],details:JSON.parse(params[2])});return {rows:[],rowCount:1}}
   throw new Error('unexpected SQL in synthetic staging integration test');
  }}};
  const create=response();
  await tasks({method:'POST',headers:{authorization:'Bearer synthetic-atlas-staging-token','content-type':'application/json'},body:{title:'Synthetic approval lifecycle test',persona:'Chief Architect',priority:'low'}},create);
  assert.equal(create.code,201);assert.equal(create.body.task.approval,'pending');assert.equal(create.body.task.status,'queued');
  const id=create.body.task.id;
  const approval=response();
  await approve({method:'POST',headers:{authorization:'Bearer synthetic-atlas-staging-token','content-type':'application/json'},body:{taskId:id,decision:'approved'}},approval);
  assert.equal(approval.code,200);assert.equal(approval.body.task.approval,'approved');assert.equal(state.task.status,'queued');
  assert.deepEqual(state.events.map(x=>x.eventType),['task.created','task.approved']);
  const replay=response();
  await approve({method:'POST',headers:{authorization:'Bearer synthetic-atlas-staging-token','content-type':'application/json'},body:{taskId:id,decision:'approved'}},replay);
  assert.equal(replay.code,409);assert.equal(state.events.length,2);
  assert.equal(process.env.TEAM_MODEL_EXECUTION_ENABLED,undefined);
  assert.deepEqual(state.transactions,['BEGIN','COMMIT','BEGIN','COMMIT','BEGIN','ROLLBACK']);
 }finally{pg.Pool.prototype.connect=connect;restore(old)}
});
