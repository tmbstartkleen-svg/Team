import test from 'node:test';
import assert from 'node:assert/strict';
import {microsoftConnectionReadiness} from '../lib/microsoft-readiness.mjs';
test('missing Microsoft settings cannot claim connection',()=>{const x=microsoftConnectionReadiness();assert.equal(x.configured,false);assert.equal(x.connected,false);assert.equal(x.monitoringActive,false);assert.equal(x.services.length,5)});
test('configured application registration is not an authenticated connection',()=>{const x=microsoftConnectionReadiness({TEAM_MS_CLIENT_ID:'11111111-1111-4111-8111-111111111111',TEAM_MS_TENANT_ID:'organizations',TEAM_MS_REDIRECT_URI:'https://team.example.com/oauth/callback'});assert.equal(x.configured,true);assert.equal(x.connected,false);assert.equal(x.monitoringActive,false)});
test('invalid redirects and credentials fail readiness',()=>{const x=microsoftConnectionReadiness({TEAM_MS_CLIENT_ID:'invalid',TEAM_MS_TENANT_ID:'organizations',TEAM_MS_REDIRECT_URI:'http://localhost/callback'});assert.equal(x.configured,false)});
