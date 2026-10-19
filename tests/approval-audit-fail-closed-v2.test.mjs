import test from 'node:test';
import assert from 'node:assert/strict';
import {recordOwnerDecision} from '../lib/d1-approval-audit.mjs';
import {handleOwnerApproval} from '../lib/owner-approval-api.mjs';

const taskId='cert-github-read-20261019-v2';
const args={taskId,decision:'approved',reason:'Explicitly scoped audit integrity regression test',auditId:'audit-safety-check-20261019'};
function db(updateRows,auditRows){
 let batches=0;
 const calls=[];
 return {
  get batches(){return batches},
  calls,
  prepare(sql){calls.push(sql);return {bind(){return this}}},
  async batch(statements){batches++;assert.equal(statements.length,2);return [{results:updateRows},{results:auditRows}]}
 };
}
test('audit transaction rejects absent task update',async()=>{
 const d=db([],[{id:'fake-audit'}]);
 await assert.rejects(recordOwnerDecision(d,args),/decision_not_recorded/);
 assert.equal(d.batches,1);
});
test('audit transaction rejects missing receipt after update',async()=>{
 const d=db([{id:taskId}],[]);
 await assert.rejects(recordOwnerDecision(d,args),/decision_not_recorded/);
 assert.equal(d.batches,1);
});
test('audit transaction rejects entirely unchanged decision',async()=>{
 const d=db([],[]);
 await assert.rejects(recordOwnerDecision(d,args),/decision_not_recorded/);
});
test('database transaction errors never count as owner approval',async()=>{
 const d=db([],[]);
 d.batch=async()=>{throw new Error('write quota exhausted')};
 await assert.rejects(recordOwnerDecision(d,args),/write quota exhausted/);
});
test('unauthenticated approval request rejected before database access',async()=>{
 let databaseTouched=false;
 const d={prepare(){databaseTouched=true;throw Error('unexpected access')},batch(){databaseTouched=true;throw Error('unexpected access')}};
 const r=await handleOwnerApproval(new Request('https://atlas-team.example/api/owner-approval',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({taskId,decision:'approved',reason:args.reason})}),{TEAM_DB:d});
 assert.equal(r.status,401);
 assert.equal(databaseTouched,false);
});
