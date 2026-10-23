import test from 'node:test';
import assert from 'node:assert/strict';
import tasks from '../api/tasks.js';
import approve from '../api/approve.js';
import events from '../api/events.js';
import execute from '../api/execute-approved.js';
import recovery from '../api/task-recover.js';
import detail from '../api/task-detail.js';
import databaseHealth from '../api/database-health.js';
import modelPolicy from '../api/model-policy.js';
import readiness from '../api/readiness.js';
import stalled from '../api/stalled-tasks.js';

function response() {
 return {
  code: 0, body: null, headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; }
 };
}

test('task API refuses unauthenticated reads and writes before using the database', async () => {
 const original = process.env.TEAM_ADMIN_TOKEN;
 try {
  process.env.TEAM_ADMIN_TOKEN = 'test-only-operator-value';
  for (const method of ['GET', 'POST']) {
   for (const authorization of [undefined, 'Bearer wrong-value']) {
    const res = response();
    await tasks({
     method,
     headers: {
      ...(authorization ? { authorization } : {}),
      'content-type': 'application/json'
     },
     body: {title: 'Synthetic test task', persona: 'Chief Architect', priority: 'low'}
    }, res);
    assert.equal(res.code, 401);
    assert.equal(res.body.error, 'unauthorized');
   }
  }
 } finally {
  if (original === undefined) delete process.env.TEAM_ADMIN_TOKEN;
  else process.env.TEAM_ADMIN_TOKEN = original;
 }
});

const otherRoutes = [
 ['approval decision', approve, 'POST'],
 ['audit events', events, 'GET'],
 ['model execution', execute, 'POST'],
 ['manual recovery', recovery, 'POST'],
 ['task detail', detail, 'GET'],
 ['database diagnostics', databaseHealth, 'GET'],
 ['model policy', modelPolicy, 'GET'],
 ['operator readiness', readiness, 'GET'],
 ['stalled task review', stalled, 'GET']
];

test('every other privileged API rejects missing and incorrect credentials before touching DB or execution', async () => {
 const original=process.env.TEAM_ADMIN_TOKEN;
 try {
  process.env.TEAM_ADMIN_TOKEN='test-only-operator-value';
  for(const [name,handler,method] of otherRoutes){
   for(const authorization of [undefined,'Bearer wrong-value']){
    const res=response();
    await handler({method, headers:{...(authorization?{authorization}:{}),'content-type':'application/json'}, query:{id:'00000000-0000-4000-8000-000000000001'}, body:{taskId:'00000000-0000-4000-8000-000000000001',decision:'approved',confirmNoRetry:true}},res);
    assert.equal(res.code,401,name);
    assert.equal(res.body.error,'unauthorized',name);
   }
  }
 } finally {
  if(original===undefined)delete process.env.TEAM_ADMIN_TOKEN;
  else process.env.TEAM_ADMIN_TOKEN=original;
 }
});

test('authorization uses exact bearer token and fails closed for malformed headers', async () => {
 const original=process.env.TEAM_ADMIN_TOKEN;
 try {
  process.env.TEAM_ADMIN_TOKEN='synthetic-staging-key';
  for(const authorization of ['synthetic-staging-key','Basic synthetic-staging-key','Bearer synthetic-staging-key extra','Bearer synthetic-staging-key ','Bearer','Bearer wrong-key']){
   const res=response();
   await tasks({method:'GET',headers:{authorization}},res);
   assert.equal(res.code,401,authorization);
  }
 } finally {
  if(original===undefined)delete process.env.TEAM_ADMIN_TOKEN;
  else process.env.TEAM_ADMIN_TOKEN=original;
 }
});
