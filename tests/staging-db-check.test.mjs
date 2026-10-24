import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {checkStagingDatabase} from '../lib/staging-db-check.mjs';
const keys=['VERCEL_ENV','TEAM_STAGING_TESTS_ENABLED','DATABASE_URL','TEAM_DATABASE_URL'];
function save(){return Object.fromEntries(keys.map(k=>[k,process.env[k]]))}
function restore(v){for(const [k,x] of Object.entries(v)){if(x===undefined)delete process.env[k];else process.env[k]=x}}
test('database probe is disabled outside preview or without explicit staging flag',async()=>{
 const old=save();
 try{
  process.env.VERCEL_ENV='production';process.env.TEAM_STAGING_TESTS_ENABLED='true';
  assert.deepEqual(await checkStagingDatabase(),{enabled:false,connected:false,schemaReady:false,writesPerformed:false});
  process.env.VERCEL_ENV='preview';delete process.env.TEAM_STAGING_TESTS_ENABLED;
  assert.deepEqual(await checkStagingDatabase(),{enabled:false,connected:false,schemaReady:false,writesPerformed:false});
 }finally{restore(old)}
});
test('staging database probe performs only schema SELECT and returns no identity or secrets',async()=>{
 const old=save(),connect=pg.Client.prototype.connect,query=pg.Client.prototype.query,end=pg.Client.prototype.end;
 let sqlSeen='';
 try{
  process.env.VERCEL_ENV='preview';process.env.TEAM_STAGING_TESTS_ENABLED='true';
  process.env.DATABASE_URL='postgresql://synthetic.invalid/atlas';delete process.env.TEAM_DATABASE_URL;
  pg.Client.prototype.connect=async function(){return this};
  pg.Client.prototype.query=async function(sql){sqlSeen=sql;return {rows:[{projects:true,tasks:true,events:true}]}};
  pg.Client.prototype.end=async function(){};
  const res=await checkStagingDatabase();
  assert.equal(res.connected,true);assert.equal(res.schemaReady,true);assert.equal(res.writesPerformed,false);
  assert.equal(Object.hasOwn(res,'database'),false);assert.equal(Object.hasOwn(res,'host'),false);
  assert.match(sqlSeen,/SELECT to_regclass/);assert.doesNotMatch(sqlSeen,/INSERT|UPDATE|DELETE|CREATE|DROP/i);
 }finally{pg.Client.prototype.connect=connect;pg.Client.prototype.query=query;pg.Client.prototype.end=end;restore(old)}
});
