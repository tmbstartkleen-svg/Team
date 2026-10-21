import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../migrations/0010_release_evidence_events.sql',import.meta.url),'utf8');
test('release evidence migration is storage only and append-only',()=>{
 assert.match(sql,/CREATE TABLE IF NOT EXISTS team_release_evidence_events/);
 assert.match(sql,/BEFORE UPDATE ON team_release_evidence_events/);
 assert.match(sql,/BEFORE DELETE ON team_release_evidence_events/);
 assert.match(sql,/CHECK\(verdict IN \('verified','rejected','revoked'\)\)/);
 assert.match(sql,/supersedes_event_id TEXT REFERENCES team_release_evidence_events\(id\)/);
 assert.doesNotMatch(sql,/CREATE\s+(?:TRIGGER|TABLE)[^;]*TEAM_TOOL_EXECUTOR_ENABLED/i);
});
test('requires source identity, digest, environment and method',()=>{
 for(const field of ['issuer','source_family','artifact_ref','artifact_sha256','environment','deployment_commit','verification_method','event_time'])assert.match(sql,new RegExp('\\b'+field+' TEXT NOT NULL'));
});
