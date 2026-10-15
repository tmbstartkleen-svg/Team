import test from 'node:test';
import assert from 'node:assert/strict';
import {microsoftConsentPlan,MICROSOFT_SERVICES} from '../lib/microsoft-365.mjs';
test('Microsoft consent starts with minimal identity scopes',()=>{const p=microsoftConsentPlan();assert.equal(p.status,'configuration-required');assert.equal(p.requiresInteractiveOwnerConsent,true);assert.equal(p.scopes.includes('Mail.Read'),false)});
test('requested mail and task scopes are read only',()=>{const p=microsoftConsentPlan(['mail','tasks']);assert.ok(p.scopes.includes('Mail.Read'));assert.ok(p.scopes.includes('Tasks.Read'));assert.ok(!p.scopes.some(x=>x.endsWith('.ReadWrite')))});
test('unregistered services cannot request access',()=>{assert.throws(()=>microsoftConsentPlan(['all-access']));assert.equal(MICROSOFT_SERVICES.length,5)});
