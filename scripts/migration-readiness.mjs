// ATLAS migration gate: decision support only; never approves, deploys, or retires.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const REQUIRED_GATES=Object.freeze([
 'source_history_mirrored','destination_ownership_verified',
 'isolated_preview_build','read_only_api_smoke','owner_auth_negative_tests',
 'security_evidence_integrity','database_backup_restore',
 'safeguard_sensor_continuity','secrets_rotated_securely',
 'cutover_rollback_rehearsed','owner_cutover_approval'
]);
const STATES=new Set(['verified','blocked','unknown']);
export function assessMigration(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw new TypeError('invalid_manifest');
 if(input.schemaVersion!==1)throw new TypeError('invalid_schema_version');
 if(typeof input.sourceRepo!=='string'||!/^[-\w]+\/[-\w.]+$/.test(input.sourceRepo))throw new TypeError('invalid_source_repo');
 if(typeof input.destinationRepo!=='string'||input.destinationRepo.length>150)throw new TypeError('invalid_destination_repo');
 if(!input.gates||typeof input.gates!=='object'||Array.isArray(input.gates))throw new TypeError('invalid_gates');
 const records=REQUIRED_GATES.map(id=>{
  const value=input.gates[id];
  if(!value||typeof value!=='object'||!STATES.has(value.status)||
     typeof value.evidence!=='string'||value.evidence.length>400)throw new TypeError('invalid_gate_'+id);
  if(value.status==='verified'&&!value.evidence.trim())throw new TypeError('missing_evidence_'+id);
  return {id,status:value.status,evidence:value.evidence};
 });
 const unknownKeys=Object.keys(input.gates).filter(x=>!REQUIRED_GATES.includes(x));
 if(unknownKeys.length)throw new TypeError('unknown_gates');
 const blocked=records.filter(x=>x.status==='blocked').map(x=>x.id);
 const unknown=records.filter(x=>x.status==='unknown').map(x=>x.id);
 const verified=records.filter(x=>x.status==='verified').map(x=>x.id);
 return {schemaVersion:1,sourceRepo:input.sourceRepo,destinationRepo:input.destinationRepo||null,
  total:records.length,verified,blocked,unknown,
  readyForCutover:blocked.length===0&&unknown.length===0&&Boolean(input.destinationRepo),
  mayDeleteSource:false,requiresSeparateRetirementApproval:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const filename=process.argv[2]||'docs/migration-readiness.json';
 const manifest=JSON.parse(readFileSync(filename,'utf8'));
 const result=assessMigration(manifest);
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(!result.readyForCutover)process.exitCode=2;
}
