import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createMicrosoftSignIn} from '../lib/microsoft-oauth.mjs';
const env={TEAM_MS_CLIENT_ID:'11111111-1111-4111-8111-111111111111',TEAM_MS_TENANT_ID:'organizations',TEAM_MS_REDIRECT_URI:'https://team.example.com/oauth/callback'};
test('OAuth PKCE signs in through Microsoft with read-only scopes',()=>{
 const x=createMicrosoftSignIn({env,services:['mail','tasks']});
 const url=new URL(x.authorizationUrl);
 assert.equal(url.hostname,'login.microsoftonline.com');
 assert.equal(url.searchParams.get('response_type'),'code');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('state'),x.state);
 assert.equal(url.searchParams.get('code_challenge'),createHash('sha256').update(x.verifier).digest('base64url'));
 assert.ok(url.searchParams.get('scope').includes('Mail.Read'));
 assert.ok(!url.searchParams.get('scope').includes('Mail.ReadWrite'));
 assert.equal(x.requiresServerSideOneTimeSession,true);
});
test('each Microsoft sign-in gets fresh CSRF and PKCE secrets',()=>{const a=createMicrosoftSignIn({env}),b=createMicrosoftSignIn({env});assert.notEqual(a.state,b.state);assert.notEqual(a.verifier,b.verifier)});
test('missing app registration cannot start Microsoft sign-in',()=>assert.throws(()=>createMicrosoftSignIn({env:{}})));
