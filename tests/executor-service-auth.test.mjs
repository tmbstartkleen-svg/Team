import test from 'node:test';
import assert from 'node:assert/strict';
import {authorizedExecutor} from '../lib/executor-service-auth.mjs';
const service='service-credential-'.repeat(3);
const req=value=>new Request('https://team.example/internal/execute',{headers:value?{authorization:value}:{}});
test('only dedicated executor secret grants service identity',async()=>{
 assert.equal(await authorizedExecutor(req('Bearer '+service),{TEAM_EXECUTOR_TOKEN:service}),true);
 assert.equal(await authorizedExecutor(req('Bearer '+service),{TEAM_OWNER_API_TOKEN:service}),false);
 assert.equal(await authorizedExecutor(req('Bearer '+service),{TEAM_EXECUTOR_TOKEN:'short'}),false);
});
test('malformed credentials fail closed',async()=>{
 const env={TEAM_EXECUTOR_TOKEN:service};
 for(const value of [null,service,'Basic '+service,'Bearer  '+service,'Bearer '+service+' extra','Bearer invalid']){
  assert.equal(await authorizedExecutor(req(value),env),false,String(value));
 }
});
