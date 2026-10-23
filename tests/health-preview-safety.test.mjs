import pg from 'pg';
import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/health.js';
function response(){
 const headers={};let status=0,body;
 return {headers,get statusCode(){return status},get body(){return body},
 setHeader(k,v){headers[k]=v},status(n){status=n;return this},json(x){body=x;return this}};
}
test('preview health is read-only and never certifies operational execution',async()=>{
 const res=response();await handler({method:'GET'},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.ok,true);
 assert.equal(res.body.productionOperational,false);
 assert.equal(res.body.capabilities.autonomousAgents,false);
 assert.equal(res.body.releaseChecks.liveWorkflowVerified,false);
 assert.equal(res.headers['Cache-Control'],'no-store');
});
test('health endpoint refuses mutation methods',async()=>{
 const res=response();await handler({method:'POST'},res);
 assert.equal(res.statusCode,405);
 assert.equal(res.body.error,'method_not_allowed');
 assert.equal(res.headers.Allow,'GET');
});

test('preview health reports read-only database verification without enabling execution',async()=>{
 const keys=['VERCEL_ENV','TEAM_STAGING_TESTS_ENABLED','DATABASE_URL','TEAM_DATABASE_URL','TEAM_ADMIN_TOKEN','OPENAI_API_KEY'];
 const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const connect=pg.Client.prototype.connect,query=pg.Client.prototype.query,end=pg.Client.prototype.end;
 try{
  process.env.VERCEL_ENV='preview';process.env.TEAM_STAGING_TESTS_ENABLED='true';
  process.env.DATABASE_URL='postgresql://synthetic.invalid/atlas';delete process.env.TEAM_DATABASE_URL;
  delete process.env.TEAM_ADMIN_TOKEN;delete process.env.OPENAI_API_KEY;
  pg.Client.prototype.connect=async function(){return this};
  pg.Client.prototype.query=async function(sql){
   assert.match(sql,/SELECT to_regclass/);
   assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE|CREATE|DROP/i);
   return {rows:[{projects:true,tasks:true,events:true}]};
  };
  pg.Client.prototype.end=async function(){};
  const res=response();await handler({method:'GET'},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.stagingDatabase.connected,true);
  assert.equal(res.body.stagingDatabase.schemaReady,true);
  assert.equal(res.body.capabilities.databaseSchemaVerified,true);
  assert.equal(res.body.capabilities.modelExecution,'disabled');
  assert.equal(res.body.capabilities.autonomousAgents,false);
  assert.equal(res.body.productionOperational,false);
 }finally{
  pg.Client.prototype.connect=connect;pg.Client.prototype.query=query;pg.Client.prototype.end=end;
  for(const [k,v] of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 }
});
