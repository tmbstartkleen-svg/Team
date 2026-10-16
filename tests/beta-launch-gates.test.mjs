import test from 'node:test';import assert from 'node:assert/strict';import {betaLaunchGates} from '../lib/beta-launch-gates.mjs';
test('beta launch blocked absent evidence',()=>{const r=betaLaunchGates();assert.equal(r.ready,false);assert.equal(r.verified,0);assert.equal(r.total,6)});
test('infrastructure alone never certifies AI workforce',()=>{const r=betaLaunchGates({cloudflareHosting:true,d1Schema:true});assert.equal(r.ready,false);assert.equal(r.verified,2)});
test('every gate requires explicit true evidence',()=>{const data={cloudflareHosting:true,d1Schema:true,ownerAuthenticated:true,collaborationWriteRead:true,agentExecution:true,securityCertification:true};assert.equal(betaLaunchGates(data).ready,true);data.agentExecution='yes';assert.equal(betaLaunchGates(data).ready,false)});
