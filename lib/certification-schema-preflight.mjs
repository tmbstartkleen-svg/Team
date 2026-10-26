// Read-only staging D1 migration preflight. Never runs DDL or certifies execution.
// A clean legacy schema is eligible for owner-reviewed planning, NOT deployment.
const LEGACY_TABLES=['team_tasks','team_approval_audit','team_execution_receipts'];
const LEGACY_TRIGGERS=[
 'team_approval_audit_no_update','team_approval_audit_no_delete',
 'team_execution_receipts_no_update','team_execution_receipts_no_delete'
];
const EVIDENCE_TABLES=['team_certification_evidence','team_certification_revocations'];
const EVIDENCE_TRIGGERS=[
 'team_certification_evidence_no_update','team_certification_evidence_no_delete',
 'team_certification_revocations_no_update','team_certification_revocations_no_delete'
];
const quoteList=list=>list.map(v=>"'"+v+"'").join(',');
export async function inspectCertificationSchemaPreflight(db){
 const fail=(reason,details={})=>({ok:false,eligibleForReview:false,migrationApplied:false,reason,...details});
 if(!db?.prepare)return fail('database_not_bound');
 try{
  const result=await db.prepare("SELECT type,name FROM sqlite_master WHERE (type='table' OR type='trigger') AND name IN ("+
   quoteList([...LEGACY_TABLES,...LEGACY_TRIGGERS,...EVIDENCE_TABLES,...EVIDENCE_TRIGGERS])+")").all();
  const rows=result?.results;
  if(!Array.isArray(rows))return fail('invalid_schema_response');
  const names=new Set(rows.map(x=>x.type+':'+x.name));
  const legacyMissing=[...LEGACY_TABLES.map(x=>'table:'+x),...LEGACY_TRIGGERS.map(x=>'trigger:'+x)].filter(x=>!names.has(x));
  if(legacyMissing.length)return fail('legacy_prerequisites_missing',{missing:legacyMissing});
  const taskInfo=await db.prepare("PRAGMA table_info('team_tasks')").all();
  const taskColumns=new Set((taskInfo?.results||[]).map(x=>x.name));
  const missingColumns=['id','state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence'].filter(x=>!taskColumns.has(x));
  if(missingColumns.length)return fail('legacy_task_columns_missing',{missing:missingColumns});
  const existing=[...EVIDENCE_TABLES.map(x=>'table:'+x),...EVIDENCE_TRIGGERS.map(x=>'trigger:'+x)].filter(x=>names.has(x));
  // An existing partial schema needs manual inventory and reconciliation.
  if(existing.length)return fail('evidence_schema_already_present',{existing});
  const integrity=await db.prepare('PRAGMA foreign_key_check').all();
  if(!Array.isArray(integrity?.results)||integrity.results.length)return fail('foreign_key_integrity_failed');
  return {ok:true,eligibleForReview:true,migrationApplied:false,
   reason:null,legacyPrerequisitesVerified:true,foreignKeyViolations:0,
   evidenceSchemaAbsent:true,ownerAuthorizationRequired:true};
 }catch{return fail('database_preflight_failed')}
}
