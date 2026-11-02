import test from 'node:test';
import assert from 'node:assert/strict';
import {saveSpecialistLearningProposal,listSpecialistLearningProposals,revokeSpecialistLearning} from '../lib/d1-specialist-learning.mjs';
const proposal={id:'source-1',specialistId:'cybersecurity-lead',type:'owner-correction',summary:'Preserve monitored security evidence',evidenceRef:'audit-1'};
function fakeDb({consent=1,changes=1}={}){
 const calls=[];
 return {
  calls,
  prepare(sql){
   return {
    bind(...params){
     calls.push({sql,params});
     return {
      first:async()=>({enabled:consent}),
      run:async()=>({success:true,meta:{changes}}),
      all:async()=>({results:[{id:'source-1',state:'proposed'}]})
     };
    }
   };
  }
 };
}
test('requires database consent before storing a proposal',async()=>{
 const db=fakeDb({consent:0});
 const r=await saveSpecialistLearningProposal(db,{ownerId:'owner-1',proposal});
 assert.equal(r.ok,false);assert.equal(db.calls.length,1);
});
test('proposal is scoped, saved once and cannot self-promote',async()=>{
 const db=fakeDb();
 const r=await saveSpecialistLearningProposal(db,{ownerId:'owner-1',proposal});
 assert.equal(r.ok,true);assert.equal(r.state,'proposed');
 assert.match(db.calls[1].sql,/INSERT OR IGNORE/);
 assert.match(db.calls[1].sql,/proposed/);
 assert.equal(db.calls[1].params[1],'owner-1');
 const duplicate=await saveSpecialistLearningProposal(fakeDb({changes:0}),{ownerId:'owner-1',proposal});
 assert.equal(duplicate.ok,false);
});
test('records and revoke operations stay owner-scoped',async()=>{
 const db=fakeDb();
 const list=await listSpecialistLearningProposals(db,{ownerId:'owner-1',specialistId:'cybersecurity-lead'});
 assert.equal(list.ok,true);assert.equal(db.calls[1].params[0],'owner-1');
 const revoked=await revokeSpecialistLearning(db,{ownerId:'owner-1',id:'source-1'});
 assert.equal(revoked.revoked,true);
 assert.match(db.calls[2].sql,/owner_id=\?/);
});
