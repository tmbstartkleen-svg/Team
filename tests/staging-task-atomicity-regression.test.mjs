import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import tasks from '../api/tasks.js';
import approve from '../api/approve.js';

function response(){return {code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
const envKeys=['VERCEL_ENV','TEAM_ADMIN_TOKEN','TEAM_DATABASE_URL','DATABASE_URL','TEAM_MODEL_EXECUTION_ENABLED'];
function saveEnv(){return Object.fromEntries(envKeys.map(k=>[k,process.env[k]]))}
function restoreEnv(old){for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
function setupEnv(){process.env.VERCEL_ENV='preview';process.env.TEAM_ADMIN_TOKEN='synthetic-atlas-atomicity-token';process.env.TEAM_DATABASE_URL='postgresql://synthetic.invalid/atlas';delete process.env.DATABASE_URL;delete process.env.TEAM_MODEL_EXECUTION_ENABLED}

test('unauthenticated task reads and approval attempts stop before database access',async()=>{
 const old=saveEnv(),connect=pg.Pool.prototype.connect;let connects=0;
 try{
  setupEnv();pg.Pool.prototype.connect=async function(){connects++;throw Error('database_must_not_be_reached')};
  const get=response();
  await tasks({method:'GET',headers:{}},get);
  assert.equal(get.code,401);assert.equal(get.body.error,'unauthorized');
  const post=response();
  await approve({method:'POST',headers:{'content-type':'application/json'},body:{taskId:'180728c0-b4d8-4c49-87e4-b5fadd4219b3',decision:'approved'}},post);
  assert.equal(post.code,401);assert.equal(post.body.error,'unauthorized');
  assert.equal(connects,0);
 }finally{pg.Pool.prototype.connect=connect;restoreEnv(old)}
});

test('task creation rolls back if its audit insert fails',async()=>{
 const old=saveEnv(),connect=pg.Pool.prototype.connect;const calls=[];
 try{
  setupEnv();pg.Pool.prototype.connect=async function(){return {release(){},query:async(sql)=>{
   calls.push(sql);
   if(sql==='BEGIN'||sql==='ROLLBACK'||sql==='COMMIT')return {rows:[],rowCount:0};
   if(sql.includes('INSERT INTO team_tasks'))return {rows:[],rowCount:1};
   if(sql.includes('INSERT INTO team_events'))throw Object.assign(Error('synthetic audit failure'),{code:'TEST_AUDIT_FAILURE'});
   throw Error('unexpected_sql');
  }}};
  const res=response();
  await tasks({method:'POST',headers:{authorization:'Bearer synthetic-atlas-atomicity-token','content-type':'application/json'},body:{title:'Atomic audit failure test',persona:'Chief Architect',priority:'low'}},res);
  assert.equal(res.code,503);assert.equal(res.body.error,'database_unavailable');
  assert.deepEqual(calls.filter(x=>['BEGIN','COMMIT','ROLLBACK'].includes(x)),['BEGIN','ROLLBACK']);
  assert.equal(process.env.TEAM_MODEL_EXECUTION_ENABLED,undefined);
 }finally{pg.Pool.prototype.connect=connect;restoreEnv(old)}
});

test('approval rolls back if its audit insert fails',async()=>{
 const old=saveEnv(),connect=pg.Pool.prototype.connect;const calls=[];
 try{
  setupEnv();pg.Pool.prototype.connect=async function(){return {release(){},query:async(sql)=>{
   calls.push(sql);
   if(sql==='BEGIN'||sql==='ROLLBACK'||sql==='COMMIT')return {rows:[],rowCount:0};
   if(sql.startsWith('UPDATE team_tasks SET approval='))return {rows:[{id:'180728c0-b4d8-4c49-87e4-b5fadd4219b3',approval:'rejected',status:'queued'}],rowCount:1};
   if(sql.includes('INSERT INTO team_events'))throw Object.assign(Error('synthetic audit failure'),{code:'TEST_AUDIT_FAILURE'});
   throw Error('unexpected_sql');
  }}};
  const res=response();
  await approve({method:'POST',headers:{authorization:'Bearer synthetic-atlas-atomicity-token','content-type':'application/json'},body:{taskId:'180728c0-b4d8-4c49-87e4-b5fadd4219b3',decision:'rejected'}},res);
  assert.equal(res.code,503);assert.equal(res.body.error,'database_unavailable');
  assert.deepEqual(calls.filter(x=>['BEGIN','COMMIT','ROLLBACK'].includes(x)),['BEGIN','ROLLBACK']);
 }finally{pg.Pool.prototype.connect=connect;restoreEnv(old)}
});
