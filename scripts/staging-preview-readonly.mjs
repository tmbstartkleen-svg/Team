#!/usr/bin/env node
// Read-only protected Preview diagnostics; never creates, approves, or executes a task.
import {vercelRequest} from '../lib/vercel-staging-transport.mjs';
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
const h=health.body;
const safeHealth=health.status===200&&h.environment==='preview'&&h.productionOperational===false&&
 h.capabilities?.modelExecution==='disabled'&&h.stagingDatabase?.connected===true&&h.stagingDatabase?.schemaReady===true;
if(!safeHealth) {
 console.log(JSON.stringify({ok:false,stage:'health',status:health.status,error:health.body.error||'preview_preflight_failed',taskWrites:0}));
 process.exit(3);
}
const expected=(process.env.ATLAS_EXPECTED_COMMIT||'').trim();
if(expected&&expected!==h.releaseCommit) {
 console.log(JSON.stringify({ok:false,stage:'commit',expectedCommit:expected,actualCommit:h.releaseCommit,taskWrites:0}));
 process.exit(3);
}
const auth=probe('/api/tasks');
const ok=auth.status===200&&auth.body.ok===true&&Array.isArray(auth.body.tasks);
console.log(JSON.stringify({ok,stage:'operator-read',status:auth.status,releaseCommit:h.releaseCommit,
 preview:true,dbReady:true,modelExecution:'disabled',taskWrites:0,
 error:ok?null:auth.status===401?'operator_token_mismatch':auth.body.error||'authenticated_read_failed'}));
if(!ok)process.exit(3);
