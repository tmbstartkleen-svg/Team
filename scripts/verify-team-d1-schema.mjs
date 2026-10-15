import fs from 'node:fs';
const requiredTables=['team_projects','team_tasks','team_messages','team_memory_consent','team_memory_items','team_message_delivery'];
const requiredTaskColumns=['lease_token','lease_until','attempt_count','completion_evidence','blocker_reason','blocker_updated_at'];
export function verifyTeamD1Schema(tables,columns){
 const rows=x=>{if(!Array.isArray(x)||!x.length||x.some(y=>y.success===false))throw Error('Invalid or failed D1 query result');return x.flatMap(y=>Array.isArray(y.results)?y.results:[])};
 const names=new Set(rows(tables).map(x=>x.name));const cols=new Set(rows(columns).map(x=>x.name));
 const missingTables=requiredTables.filter(x=>!names.has(x));const missingColumns=requiredTaskColumns.filter(x=>!cols.has(x));
 return {ok:missingTables.length===0&&missingColumns.length===0,missingTables,missingColumns};
}
if(process.argv[1]&&process.argv[1].endsWith('verify-team-d1-schema.mjs')&&process.argv.length>=4){
 const v=verifyTeamD1Schema(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),JSON.parse(fs.readFileSync(process.argv[3],'utf8')));
 if(!v.ok){console.error(JSON.stringify(v));process.exitCode=1}else console.log('Dedicated TEAM D1 schema verified');
}
