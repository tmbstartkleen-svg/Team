// Configuration-only preflight: never connects, migrates, writes, or authorizes agents.
import {checkStagingIsolation} from '../lib/staging-isolation-preflight.mjs';
const result=checkStagingIsolation(process.env);
const report={ok:result.safe,reason:result.reason,connectionAttempted:false,
 schemaApplied:false,taskExecutionAuthorized:false};
process.stdout.write(JSON.stringify(report)+'\n');
if(!result.safe)process.exitCode=2;
