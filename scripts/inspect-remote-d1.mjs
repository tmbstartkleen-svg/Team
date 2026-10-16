import fs from 'node:fs';
const [tableFile,columnFile]=process.argv.slice(2);
if(!tableFile||!columnFile)throw Error('audit_files_required');
function rows(file){const x=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(x)||!Array.isArray(x[0]?.results)||x[0].success!==true)throw Error('remote_d1_query_failed');return x[0].results}
const tables=new Set(rows(tableFile).map(x=>x.name));
const columns=new Set(rows(columnFile).map(x=>x.name));
const requiredTables=['team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery','team_approval_audit','team_execution_receipts'];
const requiredColumns=['state','owner_approved','lease_token','lease_until','attempt_count','completion_evidence','blocker_reason','blocker_updated_at'];
const missingTables=requiredTables.filter(x=>!tables.has(x));
const missingColumns=requiredColumns.filter(x=>!columns.has(x));
const lines=['## TEAM production D1 read-only audit','Required tables: '+(missingTables.length?'MISSING '+missingTables.join(', '):'PRESENT'),'Required task fields: '+(missingColumns.length?'MISSING '+missingColumns.join(', '):'PRESENT'),'Migration history and actual AI execution are not certified by this inspection.'];
const summary=lines.join('\n')+'\n';if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);console.log(summary);
if(missingTables.length||missingColumns.length)process.exitCode=1;
