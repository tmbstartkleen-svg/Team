import test from 'node:test';
import assert from 'node:assert/strict';
import {modelPolicy} from '../lib/limits.mjs';
import endpoint from '../api/model-policy.js';
test('model policy rejects unspecified model',()=>{const x=modelPolicy({TEAM_MODEL:'model-b',TEAM_ALLOWED_MODELS:'model-a'});assert.equal(x.allowed,false)});
test('model policy retains strict bounded output budget',()=>{const x=modelPolicy({});assert.equal(x.maxOutputTokens,1200);assert.equal(x.timeoutMs,23000)});
test('policy endpoint protects model information',()=>{const req={method:'GET',headers:{}},o={code:200},res={setHeader(){},status(c){o.code=c;return this},json(x){o.json=x;return this}};endpoint(req,res);assert.equal(o.code,401)});
