import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const schema=readFileSync(new URL('../db/schema.sql',import.meta.url),'utf8');
const setup=readFileSync(new URL('../scripts/setup-database.mjs',import.meta.url),'utf8');
test('TEAM schema has isolated task, project and event tables',()=>{
 for(const table of ['team_projects','team_tasks','team_events'])assert.match(schema,new RegExp('CREATE TABLE IF NOT EXISTS '+table));
});
test('database bootstrap verifies existing schema without destructive statements',()=>{
 assert.match(setup,/--verify-only/);
 assert.match(setup,/TEAM_DATABASE_URL/);
 assert.doesNotMatch(schema,/DROP TABLE|TRUNCATE TABLE/i);
});
test('execution records are linked by task id',()=>{
 assert.match(schema,/task_id uuid/);
 assert.match(schema,/team_events_task_idx/);
});
