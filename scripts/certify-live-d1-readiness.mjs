import fs from 'node:fs';
function rows(path){
 const value=JSON.parse(fs.readFileSync(path,'utf8'));
 if(!Array.isArray(value)||value[0]?.success!==true||!Array.isArray(value[0].results))throw Error('untrusted_remote_d1_result');
 return value[0].results;
}
const tables=new Set(rows('/tmp/team-d1-tables.json').map(x=>x.name));
const columns=rows('/tmp/team-d1-receipt-columns.json');
const triggers=new Set(rows('/tmp/team-d1-triggers.json').map(x=>x.name));
const violations=rows('/tmp/team-d1-foreign-keys.json');
const requiredTables=['team_tasks','team_approval_audit','team_execution_receipts'];
const requiredColumns=['id','task_id','attempt_count','outcome','evidence','created_at'];
const requiredTriggers=['team_execution_receipts_no_update','team_execution_receipts_no_delete'];
const missing=[...requiredTables.filter(x=>!tables.has(x)),...requiredColumns.filter(x=>!columns.some(c=>c.name===x)),...requiredTriggers.filter(x=>!triggers.has(x))];
if(violations.length)missing.push('foreign_key_integrity');
const ok=missing.length===0;
const summary='## Live TEAM D1 execution readiness\\n\\n- Result: '+(ok?'PASS':'BLOCKED')+
 '\\n- Missing schema/integrity checks: '+(missing.length?missing.join(', '):'none')+
 '\\n- Mode: read-only; no tasks, leases, or receipts created\\n- Scope: production schema and referential integrity only; not an atomic-batch or AI execution certification\\n';
fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY||'/dev/stdout',summary);
if(!ok)process.exitCode=1;
