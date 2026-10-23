import test from 'node:test';
import assert from 'node:assert/strict';
import tasks from '../api/tasks.js';

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
