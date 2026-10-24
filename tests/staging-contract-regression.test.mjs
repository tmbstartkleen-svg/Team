import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('task creation is authenticated and transactionally audit-logged',()=>{
 const s=read('api/tasks.js');
 assert.match(s,/authorize\(req\)/);
 assert.match(s,/INSERT INTO team_tasks/);
 assert.match(s,/INSERT INTO team_events/);
 assert.match(s,/await client.query\('BEGIN'\)/);
 assert.match(s,/await client.query\('COMMIT'\)/);
 assert.match(s,/await client.query\('ROLLBACK'\)/);
 assert.match(s,/approval:'pending'/);
});
test('task approvals require auth, pending task, and audit event',()=>{
 const s=read('api/approve.js');
 assert.match(s,/authorize\(req\)/);
 assert.match(s,/approval='pending'/);
 assert.match(s,/status='queued'/);
 assert.match(s,/INSERT INTO team_events/);
 assert.match(s,/await client.query\('ROLLBACK'\)/);
});
test('health must not claim operational certification or autonomous agents',()=>{
 const s=read('api/health.js');
 assert.match(s,/productionOperational:false/);
 assert.match(s,/autonomousAgents:false/);
 assert.match(s,/liveWorkflowVerified:false/);
});
