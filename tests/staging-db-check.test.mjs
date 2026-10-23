import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import handler from '../api/staging-db-check.js';
function response(){return {code:0,headers:{},body:null,setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this}}}
const keys=['VERCEL_ENV','TEAM_STAGING_TESTS_ENABLED','DATABASE_URL','TEAM_DATABASE_URL'];
function save(){return Object.fromEntries(keys.map(k=>[k,process.env[k]]))}
function restore(v){for(const [k,x] of Object.entries(v)){if(x===undefined)delete process.env[k];else process.env[k]=x}}
test('staging diagnostic is hidden outside preview or without explicit test flag',async()=>{
 const old=save();
 try{
  process.env.VERCEL_ENV='production';process.env.TEAM_STAGING_TESTS_ENABLED='true';
  let res=response();await handler({method:'GET'},res);assert.equal(res.code,404);
  process.env.VERCEL_ENV='preview';delete process.env.TEAM_STAGING_TESTS_ENABLED;
  res=response();await handler({method:'GET'},res);assert.equal(res.code,404);
 }finally{restore(old)}
});
test('staging diagnostic only runs read-only schema query and does not expose database identity',async()=>{
 const old=save(),connect=pg.Client.prototype.connect,query=pg.Client.prototype.query,end=pg.Client.prototype.end;
 let sqlSeen='';
 try{
  process.env.VERCEL_ENV='preview';process.env.TEAM_STAGING_TESTS_ENABLED='true';
  process.env.DATABASE_URL='postgresql://synthetic.invalid/atlas';
  delete process.env.TEAM_DATABASE_URL;
  pg.Client.prototype.connect=async function(){return this};
  pg.Client.prototype.query=async function(sql){sqlSeen=sql;return {rows:[{projects:true,tasks:true,events:true}]}};
  pg.Client.prototype.end=async function(){};
  const res=response();await handler({method:'GET'},res);
  assert.equal(res.code,200);assert.equal(res.body.schemaReady,true);
  assert.equal(res.body.writesPerformed,false);assert.equal(res.body.productionOperational,false);
  assert.equal(res.body.modelExecution,'disabled');
  assert.equal(Object.hasOwn(res.body,'database'),false);
  assert.match(sqlSeen,/SELECT to_regclass/);
  assert.doesNotMatch(sqlSeen,/INSERT|UPDATE|DELETE|CREATE|DROP/i);
 }finally{pg.Client.prototype.connect=connect;pg.Client.prototype.query=query;pg.Client.prototype.end=end;restore(old)}
});
