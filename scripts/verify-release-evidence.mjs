#!/usr/bin/env node
// Offline, read-only release evidence verifier: never calls a model, API, or database.
import {readFileSync} from 'node:fs';
import {evaluateStagingRelease} from '../lib/staging-release-evidence.mjs';
import {assessAtlasReadiness} from '../lib/operational-release-assessment.mjs';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2);
function value(name){const index=args.indexOf(name);return index>=0?args[index+1]:null}
const healthFile=value('--health'),evidenceFile=value('--evidence'),expected=value('--commit');
if(!healthFile||!evidenceFile||!expected||!/^[a-f0-9]{12}$/.test(expected)){
 console.error('Usage: node scripts/verify-release-evidence.mjs --health health.json --evidence evidence.json --commit 12hexsha');
 process.exit(2);
}
function readJson(file){const data=readFileSync(file);if(data.length>1024*1024)throw Error('input_too_large');return JSON.parse(data.toString('utf8'))}
let health,evidence;
try{health=readJson(healthFile);evidence=readJson(evidenceFile)}
catch{console.error('Input JSON missing or invalid; no release proof accepted');process.exit(2)}
// Avoid accidental credentials or copied identity headers in the output.
const matches=health?.releaseCommit===expected&&evidence?.releaseCommit===expected;
const cert=evaluateStagingRelease(health,evidence);
const operational=assessAtlasReadiness(health);
const digest=createHash('sha256').update(JSON.stringify({health,evidence})).digest('hex');
const report={kind:'ATLAS_READ_ONLY_EVIDENCE_REVIEW',expectedCommit:expected,
 evidenceDigestSha256:digest,commitMatches:matches,stagingEvidenceComplete:matches&&cert.ok,
 stagingChecks:cert.checks,productionLaunchReady:false,productionApprovalGranted:false,
 operationalBlockers:operational.blockers,networkCalls:0,taskWrites:0};
console.log(JSON.stringify(report,null,2));
if(!report.stagingEvidenceComplete)process.exitCode=1;
