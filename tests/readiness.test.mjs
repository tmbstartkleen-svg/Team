import test from 'node:test';
import assert from 'node:assert/strict';
import {readiness} from '../lib/readiness.mjs';
import api from '../api/readiness.js';
test('missing credentials never indicate operational readiness',()=>{const r=readiness({});assert.equal(r.operational,false);assert.ok(r.checks.some(c=>c.required&&!c.ready))});
test('readiness explicitly marks unavailable features',()=>{const r=readiness({TEAM_ADMIN_TOKEN:'a',TEAM_DATABASE_URL:'b',OPENAI_API_KEY:'c',TEAM_ALLOWED_MODELS:'d'});assert.equal(r.offlineInference,'not-installed');assert.equal(r.externalExecution,'disabled')});
test('readiness endpoint rejects unauthenticated callers',()=>{const req={method:'GET',headers:{}},out={code:200},res={setHeader(){},status(code){out.code=code;return this},json(data){out.data=data;return this}};api(req,res);assert.equal(out.code,401)});
