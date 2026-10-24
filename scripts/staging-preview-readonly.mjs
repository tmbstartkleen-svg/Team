#!/usr/bin/env node
// Read-only protected Preview diagnostics; never creates, approves, or executes a task.
import {vercelRequest} from '../lib/vercel-staging-transport.mjs';
import {evaluateReadOnlyPreflight} from '../lib/staging-readonly-evidence.mjs';
const base=(process.env.ATLAS_PREVIEW_URL||'').replace(/\/$/,'');
const token=process.env.TEAM_ADMIN_TOKEN||'';
let parsed;
try {parsed=new URL(base)} catch {console.error('Invalid ATLAS_PREVIEW_URL');process.exit(2)}
if(!token||parsed.protocol!=='https:'||!parsed.hostname.endsWith('.vercel.app')) {
 console.error('Missing operator token or invalid Preview URL');process.exit(2);
}
function probe(path) {
 try{return vercelRequest({base,path,token})}
 catch(error){return {status:0,body:{error:error.message}}}
}
const health=probe('/api/health');
const expected=(process.env.ATLAS_EXPECTED_COMMIT||'').trim();
const first=evaluateReadOnlyPreflight(health,null,expected);
if(first.stage!=='operator-read'){
 console.log(JSON.stringify(first));process.exit(3);
}
const result=evaluateReadOnlyPreflight(health,probe('/api/tasks'),expected);
console.log(JSON.stringify(result));
if(!result.ok)process.exit(3);
