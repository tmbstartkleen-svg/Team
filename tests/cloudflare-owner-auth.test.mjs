import test from 'node:test';
import assert from 'node:assert/strict';
import {authorized} from '../lib/owner-collaboration-api.mjs';

const token='owner-token-'.repeat(4);
const req=value=>new Request('https://team.example/api/owner-projects',{headers:value===null?{}:{authorization:value}});
test('Cloudflare owner API accepts only a single Bearer credential',async()=>{
 const env={TEAM_OWNER_API_TOKEN:token};
 assert.equal(await authorized(req('Bearer '+token),env),true);
 assert.equal(await authorized(req('bearer '+token),env),true);
 for(const header of [null,token,'Basic '+token,'Bearer  '+token,'Bearer '+token+' extra','Bearer '+token+' ','Bearer invalid']){
  assert.equal(await authorized(req(header),env),false,String(header));
 }
});
test('owner API fails closed when secret is not configured',async()=>{
 assert.equal(await authorized(req('Bearer '+token),{}),false);
 assert.equal(await authorized(req('Bearer '+token),{TEAM_OWNER_API_TOKEN:'short'}),false);
});
