import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyOwnerOperation,evaluateOwnerOperation,validateAutomationPlan} from '../lib/owner-settings-automation-policy.mjs';
const grant=(action='settings.change')=>({trustedSource:'server-verified',grantId:'grant-1234',
 action,target:'atlas',expiresAt:'2099-01-01T00:00:00.000Z',idempotencyKey:'request-1234',receiptRequired:true});
const check=(action,opts={})=>evaluateOwnerOperation({action,target:'atlas',requesterAuthenticated:true,
 toolConnected:true,persistedGrant:grant(action),now:Date.parse('2026-11-02'),...opts});
test('unknown operations fail closed',()=>{assert.equal(classifyOwnerOperation('terminal.unrestricted'),null);
 assert.equal(check('terminal.unrestricted').allowed,false)});
test('owner auth and actual connection required even with stored grant',()=>{
 assert.equal(check('settings.change',{requesterAuthenticated:false}).reason,'owner_authentication_required');
 assert.equal(check('settings.change',{toolConnected:false}).reason,'tool_not_connected');
});
test('target, verified origin, expiry, and revocation are mandatory',()=>{
 assert.equal(check('settings.change',{target:'other'}).allowed,false);
 assert.equal(check('settings.change',{persistedGrant:{...grant(),trustedSource:'client'}}).allowed,false);
 assert.equal(check('settings.change',{persistedGrant:{...grant(),expiresAt:'2020-01-01T00:00:00Z'}}).allowed,false);
 assert.equal(check('settings.change',{persistedGrant:{...grant(),revoked:true}}).allowed,false);
});
test('mutating operations require receipts and idempotency',()=>{
 assert.equal(check('settings.change',{persistedGrant:{...grant(),receiptRequired:false}}).reason,'durable_receipt_required');
 assert.equal(check('settings.change',{persistedGrant:{...grant(),idempotencyKey:null}}).allowed,false);
 assert.equal(check('settings.change').allowed,true);
});
test('email sending and deletion require separate confirmation',()=>{
 for(const action of ['email.send','automation.delete','browser.submit','computer.files.change','settings.credentials.rotate']){
  assert.equal(check(action).reason,'explicit_confirmation_required');
  assert.equal(check(action,{confirmation:true,persistedGrant:{...grant(action),explicitConfirmation:true}}).allowed,true);
 }
});
test('automation proposals stay disabled and bounded',()=>{
 assert.equal(validateAutomationPlan({id:'nightly',action:'automation.inspect',target:'atlas',intervalMinutes:1440,maxRuns:30,enabled:false}).ok,true);
 for(const wrong of [{enabled:true},{intervalMinutes:1},{maxRuns:0},{action:'execute-anything'}]){
  const v={id:'nightly',action:'automation.inspect',target:'atlas',intervalMinutes:1440,maxRuns:30,enabled:false,...wrong};
  assert.equal(validateAutomationPlan(v).ok,false);
 }
});
