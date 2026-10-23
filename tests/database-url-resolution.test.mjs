import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveDatabaseUrl} from '../lib/database-url.mjs';
import {readiness} from '../lib/readiness.mjs';
test('native Neon DATABASE_URL is accepted in preview only',()=>{
 const env={VERCEL_ENV:'preview',DATABASE_URL:'postgresql://preview.invalid/db'};
 assert.equal(resolveDatabaseUrl(env),env.DATABASE_URL);
 assert.equal(readiness(env).checks.find(x=>x.id==='dedicated-database').ready,true);
});
test('production never inherits preview integration DATABASE_URL',()=>{
 const env={VERCEL_ENV:'production',DATABASE_URL:'postgresql://preview.invalid/db'};
 assert.equal(resolveDatabaseUrl(env),null);
 assert.equal(readiness(env).checks.find(x=>x.id==='dedicated-database').ready,false);
});
test('explicit dedicated TEAM_DATABASE_URL wins in either environment',()=>{
 const env={VERCEL_ENV:'production',TEAM_DATABASE_URL:'postgresql://explicit.invalid/db',DATABASE_URL:'postgresql://preview.invalid/db'};
 assert.equal(resolveDatabaseUrl(env),env.TEAM_DATABASE_URL);
});
