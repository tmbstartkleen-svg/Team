import test from 'node:test';
import assert from 'node:assert/strict';
import {createD1SignedAuditEventSource} from '../lib/d1-signed-audit-event-source.mjs';
const scope={kind:'owner-authenticated-approval',taskId:'safe-task-100',stepId:'safe-step-100',idempotencyKey:'safe-key-100'};
const event={...scope,eventId:'audit-event-100'};
const db=rows=>({prepare(sql){assert.match(sql,/^SELECT /);assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE/i);return {bind(...args){assert.deepEqual(args,Object.values(scope));return {all:async()=>({results:rows})}}}}});
test('reads one scoped signed audit record without asserting authenticity',async()=>{
 const result=await createD1SignedAuditEventSource({db:db([{issuer:'audit-signer-100',signature:'signature-placeholder',event_json:JSON.stringify(event)}])})(scope);
 assert.deepEqual(result.event,event);
 assert.equal(result.sourceVerified,undefined);
});
test('duplicate records, malformed payload and outages fail closed',async()=>{
 const row={issuer:'audit-signer-100',signature:'placeholder',event_json:JSON.stringify(event)};
 for(const rows of [[],[row,row],[{...row,event_json:'bad-json'}]]){
  assert.equal(await createD1SignedAuditEventSource({db:db(rows)})(scope),null);
 }
 assert.equal(await createD1SignedAuditEventSource({db:{prepare(){throw Error('outage')}}})(scope),null);
});
