import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createD1OriginObservationReader} from '../lib/d1-origin-observation-reader.mjs';
const scope={kind:'owner-authenticated-approval',taskId:'safe-task-123',stepId:'safe-step-123',idempotencyKey:'safe-key-123'};
test('append-only upstream source schema and scoped read-only retrieval',async()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  sql.exec(readFileSync(new URL('../migrations/0012_origin_observations.sql',import.meta.url),'utf8'));
  const e={...scope,eventId:'origin-event-123',sourceId:'origin-source-123'};
  sql.prepare('INSERT INTO team_origin_observations(event_id,source_id,issuer,kind,task_id,step_id,idempotency_key,event_json,signature) VALUES(?,?,?,?,?,?,?,?,?)')
   .run(e.eventId,e.sourceId,'origin-issuer-123',e.kind,e.taskId,e.stepId,e.idempotencyKey,JSON.stringify(e),'a'.repeat(86));
  const db={prepare(query){assert.match(query,/^SELECT /);return{bind(...args){return{all:async()=>({results:sql.prepare(query).all(...args)})}}}}};
  assert.deepEqual((await createD1OriginObservationReader(db)(scope)).event,e);
  assert.throws(()=>sql.exec("UPDATE team_origin_observations SET issuer='bad'"),/origin_immutable/);
  assert.throws(()=>sql.exec('DELETE FROM team_origin_observations'),/origin_immutable/);
  assert.equal(await createD1OriginObservationReader(db)({...scope,taskId:'other-task-123'}),null);
  assert.equal(await createD1OriginObservationReader(db)({...scope,taskId:'cert-github-read-20261019-v2'}),null);
 }finally{sql.close()}
});
test('unavailable, duplicate, or malformed upstream observations are never trusted',async()=>{
 const reader=createD1OriginObservationReader({prepare(){throw Error('offline')}});
 assert.equal(await reader(scope),null);
});
