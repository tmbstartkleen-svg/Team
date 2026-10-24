import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import tasks from '../api/tasks.js';
function response(){return {code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
const keys=['VERCEL_ENV','TEAM_ADMIN_TOKEN','TEAM_DATABASE_URL','DATABASE_URL','TEAM_MODEL_EXECUTION_ENABLED'];
function save(){return Object.fromEntries(keys.map(k=>[k,process.env[k]]))}
function restore(old){for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
test('authenticated staging task creation persists queued/pending task and audit event without execution',async()=>{
 const old=save(),connect=pg.Pool.prototype.connect;const state={task:null,events:[],tx:[]};
 try{
  process.env.VERCEL_ENV='preview';process.env.TEAM_ADMIN_TOKEN='synthetic-staging-admin-token';
  process.env.TEAM_DATABASE_URL='postgresql://mock.invalid/atlas';delete process.env.DATABASE_URL;
  delete process.env.TEAM_MODEL_EXECUTION_ENABLED;
  pg.Pool.prototype.connect=async function(){return {release(){},query:async(sql,params=[])=>{
   if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)){state.tx.push(sql);return {rows:[],rowCount:0}}
   if(sql.includes('INSERT INTO team_tasks')){state.task={id:params[0],title:params[1],persona:params[2],priority:params[3],status:'queued',approval:'pending'};return {rows:[],rowCount:1}}
   if(sql.includes('INSERT INTO team_events')){state.events.push({taskId:params[0],eventType:params[1],details:JSON.parse(params[2])});return {rows:[],rowCount:1}}
   throw new Error('unexpected SQL in staging test');
  }}};
  const res=response();
  await tasks({method:'POST',headers:{authorization:'Bearer synthetic-staging-admin-token','content-type':'application/json'},body:{title:'Synthetic staging persistence test',persona:'Chief Architect',priority:'low'}},res);
  assert.equal(res.code,201);assert.equal(res.body.ok,true);
  assert.equal(res.body.task.status,'queued');assert.equal(res.body.task.approval,'pending');
  assert.equal(state.task.id,res.body.task.id);assert.equal(state.events.length,1);
  assert.equal(state.events[0].eventType,'task.created');assert.deepEqual(state.tx,['BEGIN','COMMIT']);
  assert.equal(process.env.TEAM_MODEL_EXECUTION_ENABLED,undefined);
 }finally{pg.Pool.prototype.connect=connect;restore(old)}
});
