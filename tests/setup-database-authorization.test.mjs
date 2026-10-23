import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const script=new URL('../scripts/setup-database.mjs',import.meta.url);
function run(extra={}) {
 const env={PATH:process.env.PATH,HOME:process.env.HOME,...extra};
 return spawnSync(process.execPath,[script.pathname],{env,encoding:'utf8',timeout:5000});
}
test('database schema setup blocks writes before opening any connection by default',()=>{
 const x=run({TEAM_DATABASE_URL:'postgresql://user@127.0.0.1/nonexistent'});
 assert.equal(x.status,5);
 assert.match(x.stderr,/Schema application blocked/);
});
test('flag alone does not authorize schema write without isolated staging identity',()=>{
 const x=run({TEAM_STAGING_SCHEMA_APPLY_APPROVED:'true',TEAM_DATABASE_URL:'postgresql://user@127.0.0.1/nonexistent'});
 assert.equal(x.status,5);
 assert.match(x.stderr,/Schema application blocked/);
});

test('preview verify-only refuses unknown database before connecting',()=>{
 const env={PATH:process.env.PATH,HOME:process.env.HOME,VERCEL_ENV:'preview',TEAM_DATABASE_URL:'postgresql://user@127.0.0.1/nonexistent'};
 const result=spawnSync(process.execPath,[script.pathname,'--verify-only'],{env,encoding:'utf8',timeout:5000});
 assert.equal(result.status,5);
 assert.match(result.stderr,/Staging database access blocked/);
});

test('even matching preliminary staging config and write opt-in cannot apply schema',()=>{
 const result=run({
  VERCEL_ENV:'preview',TEAM_STAGING_TESTS_ENABLED:'true',
  TEAM_STAGING_SCHEMA_APPLY_APPROVED:'true',
  TEAM_DATABASE_URL:'postgresql://stage@stage.example.invalid/atlas_stage',
  TEAM_PRODUCTION_DATABASE_HOST:'production.example.invalid',
  TEAM_STAGING_INSTANCE_ID:'atlas-staging-synthetic-20261022'
 });
 assert.equal(result.status,5);
 assert.match(result.stderr,/independent staging provider verification unavailable/);
});
