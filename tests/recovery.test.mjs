import test from 'node:test';
import assert from 'node:assert/strict';
import detail from '../api/task-detail.js';
import recover from '../api/task-recover.js';
function mock(method,body={},query={},headers={}){
 const req={method,body,query,headers},out={code:200};
 const res={setHeader(){},status(c){out.code=c;return res},json(x){out.data=x;return res}};
 return {req,res,out};
}
test('task detail requires authorization',async()=>{const x=mock('GET',{}, {id:'00000000-0000-4000-8000-000000000001'});await detail(x.req,x.res);assert.equal(x.out.code,401)});
test('recovery requires authorization',async()=>{const x=mock('POST',{taskId:'00000000-0000-4000-8000-000000000001',confirmNoRetry:true});await recover(x.req,x.res);assert.equal(x.out.code,401)});
test('recovery never silently retries',async()=>{const old=process.env.TEAM_ADMIN_TOKEN;process.env.TEAM_ADMIN_TOKEN='test';try{const x=mock('POST',{taskId:'00000000-0000-4000-8000-000000000001',confirmNoRetry:false},{},{authorization:'Bearer test','content-type':'application/json'});await recover(x.req,x.res);assert.equal(x.out.code,403);assert.equal(x.out.data.error,'confirmation_required')}finally{if(old===undefined)delete process.env.TEAM_ADMIN_TOKEN;else process.env.TEAM_ADMIN_TOKEN=old}});
