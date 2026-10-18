import test from 'node:test';import assert from 'node:assert/strict';
import {githubToolReadiness} from '../lib/github-tool-readiness.mjs';
import worker from '../src/cloudflare-worker.js';
test('defaults fail closed without leaking secrets',()=>{const r=githubToolReadiness({});assert.deepEqual(r,{credentialsConfigured:false,allowlistConfigured:false,executionReleased:false,readyForControlledTest:false})});
test('configured read-only integration is separate from executor release',async()=>{const env={TEAM_GITHUB_READ_TOKEN:'very-secret-github-token',TEAM_GITHUB_READ_REPOSITORIES:'tmbstartkleen-svg/Team'};const r=await worker.fetch(new Request('https://atlas-team.example/api/github-tool-readiness'),env);assert.equal(r.status,200);const body=await r.json();assert.equal(body.readyForControlledTest,true);assert.equal(body.executionReleased,false);assert.equal(JSON.stringify(body).includes('very-secret'),false);assert.equal(JSON.stringify(body).includes('tmbstartkleen'),false)});
test('invalid allowlist blocks readiness',()=>{assert.equal(githubToolReadiness({TEAM_GITHUB_READ_TOKEN:'12345678',TEAM_GITHUB_READ_REPOSITORIES:'https://example.com'}).readyForControlledTest,false)});
