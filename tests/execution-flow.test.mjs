import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import execute from '../api/execute-approved.js';

const TASK='00000000-0000-4000-8000-000000000001';
function mockResponse(){const out={status:200,body:null};const res={setHeader(){},status(n){out.status=n;return res},json(b){out.body=b;return res}};return {res,out}}
async function runScenario({provider='success',approved=true,initialStatus='queued'}={}){
 const oldEnv=Object.fromEntries(['TEAM_ADMIN_TOKEN','OPENAI_API_KEY','TEAM_DATABASE_URL','TEAM_MODEL','TEAM_ALLOWED_MODELS'].map(k=>[k,process.env[k]]));
 const oldConnect=pg.Pool.prototype.connect,oldFetch=globalThis.fetch;
 const state={status:initialStatus,approval:approved?'approved':'pending',events:[],providerCalls:0,transactions:[]};
 pg.Pool.prototype.connect=async function(){
  return {release(){},query:async(sql,params=[])=>{
   if(sql==='BEGIN'||sql==='COMMIT'||sql==='ROLLBACK'){state.transactions.push(sql);return {rows:[],rowCount:0}}
   if(sql.includes("status='running'")&&sql.includes("status='queued'")){if(state.status!=='queued'||state.approval!=='approved')return {rows:[],rowCount:0};state.status='running';return {rows:[{id:TASK,title:'Review a deployment plan',persona:'Chief Architect'}],rowCount:1}}
   if(sql.includes("status='completed'")){if(state.status!=='running')return {rows:[],rowCount:0};state.status='completed';return {rows:[{id:TASK}],rowCount:1}}
   if(sql.includes("status='failed'")){if(state.status!=='running')return {rows:[],rowCount:0};state.status='failed';return {rows:[{id:TASK}],rowCount:1}}
   if(sql.includes('INSERT INTO team_events')){state.events.push(params[1]);return {rows:[],rowCount:1}}
   throw new Error('Unexpected SQL: '+sql);
  }};
 };
 globalThis.fetch=async()=>{state.providerCalls++;return {ok:true,headers:new Headers(),body:null,text:async()=>JSON.stringify(provider==='success'?{id:'resp-test',status:'completed',output_text:'A safe plan for review.'}:provider==='empty'?{id:'resp-test',status:'completed',output_text:''}:{status:'failed',error:{code:'failure'}})}};
 process.env.TEAM_ADMIN_TOKEN='test-operator';
 process.env.OPENAI_API_KEY='test-key';
 process.env.TEAM_DATABASE_URL='postgresql://test:pass@localhost:5432/team';
 process.env.TEAM_MODEL='gpt-5-mini';
 process.env.TEAM_ALLOWED_MODELS='gpt-5-mini';
 const {res,out}=mockResponse();
 try{await execute({method:'POST',headers:{authorization:'Bearer test-operator','content-type':'application/json'},body:{taskId:TASK}},res);return {out,state}}
 finally{pg.Pool.prototype.connect=oldConnect;globalThis.fetch=oldFetch;for(const [k,v] of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
}
test('approved task executes once and commits completion audit',async()=>{
 const {out,state}=await runScenario();
 assert.equal(out.status,200);assert.equal(state.status,'completed');assert.deepEqual(state.events,['task.model_started','task.model_completed']);assert.equal(state.providerCalls,1);assert.deepEqual(state.transactions,['BEGIN','COMMIT','BEGIN','COMMIT']);
});
test('unapproved task cannot call provider',async()=>{
 const {out,state}=await runScenario({approved:false});
 assert.equal(out.status,409);assert.equal(state.providerCalls,0);assert.equal(state.status,'queued');assert.equal(state.events.length,0);
});
test('empty model result transitions to failed with audit',async()=>{
 const {out,state}=await runScenario({provider:'empty'});
 assert.equal(out.status,502);assert.equal(state.status,'failed');assert.deepEqual(state.events,['task.model_started','task.model_failed']);
});
test('provider failure transitions to failed without claiming completion',async()=>{
 const {out,state}=await runScenario({provider:'failed'});
 assert.equal(out.status,502);assert.equal(state.status,'failed');assert.ok(!state.events.includes('task.model_completed'));
});

test('already-running task cannot trigger another provider request',async()=>{
 const {out,state}=await runScenario({initialStatus:'running'});
 assert.equal(out.status,409);assert.equal(state.providerCalls,0);assert.equal(state.status,'running');assert.deepEqual(state.events,[]);
});
test('completed task cannot be executed twice',async()=>{
 const {out,state}=await runScenario({initialStatus:'completed'});
 assert.equal(out.status,409);assert.equal(state.providerCalls,0);assert.equal(state.status,'completed');assert.deepEqual(state.events,[]);
});
test('rejected model output never records successful completion',async()=>{
 const {state}=await runScenario({provider:'empty'});
 assert.deepEqual(state.transactions,['BEGIN','COMMIT','BEGIN','COMMIT']);
 assert.equal(state.events.includes('task.model_completed'),false);
});
