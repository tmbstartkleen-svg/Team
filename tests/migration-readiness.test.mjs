import test from 'node:test';
import assert from 'node:assert/strict';
import {assessMigration,REQUIRED_GATES} from '../scripts/migration-readiness.mjs';
import {readFileSync} from 'node:fs';
const mk=()=>({schemaVersion:1,sourceRepo:'tmbstartkleen-svg/Team',destinationRepo:'',
 gates:Object.fromEntries(REQUIRED_GATES.map(id=>[id,{status:'unknown',evidence:''}]))});
test('default state blocks cutover and never allows source deletion',()=>{
 const r=assessMigration(mk());
 assert.equal(r.readyForCutover,false);assert.equal(r.mayDeleteSource,false);
 assert.equal(r.unknown.length,REQUIRED_GATES.length);
});
test('each gate needs inspectable evidence before verified',()=>{
 const m=mk();m.gates.source_history_mirrored={status:'verified',evidence:''};
 assert.throws(()=>assessMigration(m),/missing_evidence/);
});
test('rejects unexpected gates and invalid status',()=>{
 const m=mk();m.gates.silent_override={status:'verified',evidence:'made up'};
 assert.throws(()=>assessMigration(m),/unknown_gates/);
 delete m.gates.silent_override;m.gates.owner_cutover_approval.status='approved';
 assert.throws(()=>assessMigration(m),/invalid_gate/);
});
test('all verified requires destination and still forbids automatic retirement',()=>{
 const m=mk();for(const g of REQUIRED_GATES)m.gates[g]={status:'verified',evidence:'Independent verification recorded'};
 const missing=assessMigration(m);assert.equal(missing.readyForCutover,false);
 m.destinationRepo='authorized-org/atlas-backup';
 const r=assessMigration(m);assert.equal(r.readyForCutover,true);
 assert.equal(r.mayDeleteSource,false);assert.equal(r.requiresSeparateRetirementApproval,true);
});
test('missing checks fail closed',()=>{const m=mk();delete m.gates.database_backup_restore;assert.throws(()=>assessMigration(m),/invalid_gate/);});
