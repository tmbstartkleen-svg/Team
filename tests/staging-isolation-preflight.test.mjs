import test from 'node:test';
import assert from 'node:assert/strict';
import {checkStagingIsolation} from '../lib/staging-isolation-preflight.mjs';
const base={VERCEL_ENV:'preview',TEAM_STAGING_TESTS_ENABLED:'true',
 TEAM_DATABASE_URL:'postgresql://staging@staging.example.invalid/atlas_staging',
 TEAM_PRODUCTION_DATABASE_URL:'postgresql://prod@prod.example.invalid/atlas_production',
 TEAM_STAGING_INSTANCE_ID:'atlas-staging-separate-20261022'};
test('explicitly separate identities only pass preflight, never authorize tests',()=>{
 assert.deepEqual(checkStagingIsolation(base),{safe:true,reason:'isolation_preflight_only',mayRunStagingTests:false});
});
test('production reuse, missing production reference, absent opt in, and prod environment fail closed',()=>{
 for(const patch of [
  {VERCEL_ENV:'production'},{TEAM_STAGING_TESTS_ENABLED:'false'},
  {TEAM_DATABASE_URL:base.TEAM_PRODUCTION_DATABASE_URL},
  {TEAM_DATABASE_URL:'postgresql://another-user@prod.example.invalid/another_database'},
  {TEAM_PRODUCTION_DATABASE_URL:''},{TEAM_STAGING_INSTANCE_ID:''},
  {TEAM_DATABASE_URL:'sqlite:memory'}
 ])assert.equal(checkStagingIsolation({...base,...patch}).safe,false,JSON.stringify(patch));
});
