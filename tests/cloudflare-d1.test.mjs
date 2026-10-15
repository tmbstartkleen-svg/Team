import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../migrations/0001_team_core.sql',import.meta.url),'utf8');
test('TEAM D1 migration has dedicated project task and message tables',()=>{for(const table of ['team_projects','team_tasks','team_messages'])assert.match(sql,new RegExp('CREATE TABLE IF NOT EXISTS '+table+'\\b'))});
test('TEAM D1 migration preserves approval and owner-private message semantics',()=>{assert.match(sql,/owner_approved INTEGER NOT NULL DEFAULT 0/);assert.match(sql,/owner-private/);assert.match(sql,/REFERENCES team_projects/);assert.doesNotMatch(sql,/DROP TABLE|DELETE FROM|ATTACH DATABASE/i)});
