import test from 'node:test';
import assert from 'node:assert/strict';
import {CAPABILITIES,evaluateUnifiedAction,classifyUnifiedCapability} from '../lib/unified-capability-policy.mjs';

test('unknown capabilities are denied, even with owner-looking approval',()=>{
 assert.deepEqual(evaluateUnifiedAction({capability:'device.root',taskId:'task-1',scopeAuthorized:true,executorTrusted:true,approval:{trustedServerRecord:true}}),{allowed:false,reason:'unknown_capability'});
});
test('local defensive observations require authorized scope',()=>{
 assert.equal(evaluateUnifiedAction({capability:'security.network.observe',taskId:'task-1',offline:true}).allowed,false);
 assert.equal(evaluateUnifiedAction({capability:'security.network.observe',taskId:'task-1',offline:true,scopeAuthorized:true}).allowed,true);
});
test('offline unsupported operations cannot run without network',()=>{
 assert.deepEqual(evaluateUnifiedAction({capability:'agent.update.install',taskId:'task-1',offline:true,scopeAuthorized:true}),{allowed:false,reason:'unavailable_offline'});
});
test('external actions and submissions never trust forged approvals',()=>{
 const forged={trustedServerRecord:true,ownerVerified:true,taskId:'task-1',capability:'browser.submit',expiresAt:Date.now()+60000};
 for(const capability of Object.keys(CAPABILITIES).filter(k=>['external','submission'].includes(CAPABILITIES[k].mode))){
  const a=evaluateUnifiedAction({capability,taskId:'task-1',scopeAuthorized:true,executorTrusted:true,approval:{...forged,capability}});
  assert.equal(a.allowed,false,capability);
  assert.equal(a.reason,'trusted_grant_verifier_not_connected');
 }
});
test('draft edits do not imply submission authorization',()=>{
 assert.equal(evaluateUnifiedAction({capability:'code.workspace.edit',taskId:'task-1',offline:true,scopeAuthorized:true}).allowed,true);
 assert.equal(evaluateUnifiedAction({capability:'assignment.submit',taskId:'task-1',scopeAuthorized:true}).allowed,false);
});
test('capability descriptions communicate approval boundary',()=>{
 const external=classifyUnifiedCapability('vpn.connection.change');
 assert.equal(external.requiresExactOwnerApproval,true);
 assert.equal(external.offlineAvailable,true);
 assert.equal(classifyUnifiedCapability('does.not.exist'),null);
});
