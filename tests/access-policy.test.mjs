import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateAccess,ACCESS_MODES} from '../lib/access-policy.mjs';
test('four access modes are supported',()=>assert.deepEqual(ACCESS_MODES,['observer','approval','delegated','full']));
test('observer cannot send mail',()=>assert.equal(evaluateAccess({mode:'observer',action:'send-email'}).allowed,false));
test('approval mode requires explicit owner approval',()=>{assert.equal(evaluateAccess({action:'send-email'}).allowed,false);assert.equal(evaluateAccess({action:'send-email',ownerApproved:true}).allowed,true)});
test('delegated actions require explicit scope',()=>{assert.equal(evaluateAccess({mode:'delegated',action:'send-email'}).allowed,false);assert.equal(evaluateAccess({mode:'delegated',action:'send-email',scopes:['send-email']}).allowed,true)});
test('full access still requires scope and sensitive action approval',()=>{assert.equal(evaluateAccess({mode:'full',action:'spend',scopes:['spend']}).allowed,false);assert.equal(evaluateAccess({mode:'full',action:'spend',scopes:['spend'],ownerApproved:true}).allowed,true)});
test('revocation and expiry override grants',()=>{assert.equal(evaluateAccess({mode:'full',action:'send-email',scopes:['send-email'],revoked:true}).allowed,false);assert.equal(evaluateAccess({mode:'full',action:'send-email',scopes:['send-email'],expiresAt:'2000-01-01T00:00:00Z'}).allowed,false)});
