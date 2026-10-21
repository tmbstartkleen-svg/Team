import test from 'node:test';
import assert from 'node:assert/strict';
import {readTrustedReleaseEvidence} from '../lib/trusted-release-evidence-reader.mjs';
const commit='a'.repeat(40),digest='b'.repeat(64);
const row={id:'evidence-0001',requirement_key:'ci',issuer:'github-actions',source_family:'github-actions',artifact_ref:'https://github.com/example/Team/actions/runs/123',artifact_sha256:digest,environment:'production',deployment_commit:commit,verification_method:'signed-artifact-lookup',verdict:'verified',supersedes_event_id:null,event_time:'2026-10-21T12:00:00Z'};
const db=(results)=>({prepare(sql){assert.match(sql,/SELECT id,requirement_key/);assert.doesNotMatch(sql,/INSERT|UPDATE|DELETE/i);return {bind(...args){assert.deepEqual(args,['production',commit,0]);return {all:async()=>({results})}}}}});
test('reader blocks absent binding, invalid context and schema errors',async()=>{
 assert.deepEqual(await readTrustedReleaseEvidence({deploymentCommit:commit,now:row.event_time,verifiers:{}}),{});
 assert.deepEqual(await readTrustedReleaseEvidence({db:db([row]),deploymentCommit:'bad',now:row.event_time,verifiers:{}}),{});
 assert.deepEqual(await readTrustedReleaseEvidence({db:{prepare(){throw Error('missing table')}},deploymentCommit:commit,now:row.event_time,verifiers:{}}),{});
});
test('reader never treats a stored verified flag as proof',async()=>{
 assert.deepEqual(await readTrustedReleaseEvidence({db:db([row]),deploymentCommit:commit,now:row.event_time,verifiers:{}}),{});
 const result=await readTrustedReleaseEvidence({db:db([row]),deploymentCommit:commit,now:row.event_time,verifiers:{'github-actions':async()=>({verified:true,issuer:row.issuer,artifactDigest:digest})}});
 assert.equal(result.ci.verified,true);
});
test('reader fails closed on source failure or conflicting duplicate ids',async()=>{
 const args={db:db([row]),deploymentCommit:commit,now:row.event_time};
 assert.deepEqual(await readTrustedReleaseEvidence({...args,verifiers:{'github-actions':async()=>{throw Error('offline')}}}),{});
 assert.deepEqual(await readTrustedReleaseEvidence({...args,db:db([row,{...row}]),verifiers:{'github-actions':async()=>({verified:true,issuer:row.issuer,artifactDigest:digest})}}),{});
});

test('reader fails closed when a full result page may omit revocations',async()=>{
 const rows=Array.from({length:500},(_,i)=>({...row,id:'evidence-'+String(i).padStart(6,'0'),artifact_sha256:digest}));
 assert.deepEqual(await readTrustedReleaseEvidence({db:db(rows),deploymentCommit:commit,now:row.event_time,verifiers:{'github-actions':async()=>({verified:true,issuer:row.issuer,artifactDigest:digest})}}),{});
});

test('reader finds a revocation in a second evidence page',async()=>{
 const first=Array.from({length:500},(_,i)=>({...row,id:'evidence-'+String(i).padStart(6,'0')}));
 const revocation={...row,id:'revocation-0500',verdict:'revoked',supersedes_event_id:'evidence-000000'};
 const seen=[];
 const paging={prepare(){return{bind(environment,sha,offset){seen.push(offset);return{all:async()=>({results:offset===0?first:offset===500?[revocation]:[]})}}}}};
 const result=await readTrustedReleaseEvidence({db:paging,deploymentCommit:commit,now:row.event_time,verifiers:{'github-actions':async()=>({verified:true,issuer:row.issuer,artifactDigest:digest})}});
 assert.deepEqual(seen,[0,500]);
 // Other evidence can remain eligible, but the revoked event must be excluded.
 assert.equal(result.ci?.verified,true);
});

test('reader excludes the only verified evidence when its revocation is on a later page',async()=>{
 const first=[{...row,id:'evidence-target'},...Array.from({length:499},(_,i)=>({...row,id:'expired-'+String(i).padStart(6,'0'),event_time:'2020-01-01T00:00:00Z'}))];
 const revocation={...row,id:'revocation-later',verdict:'revoked',supersedes_event_id:'evidence-target'};
 const paging={prepare(){return {bind(_environment,_commit,offset){return {all:async()=>({results:offset===0?first:offset===500?[revocation]:[]})}}}}};
 const proof=await readTrustedReleaseEvidence({db:paging,deploymentCommit:commit,now:row.event_time,verifiers:{'github-actions':async()=>({verified:true,issuer:row.issuer,artifactDigest:digest})}});
 assert.deepEqual(proof,{});
});
test('reader fails closed on an incomplete later page',async()=>{
 const first=Array.from({length:500},(_,i)=>({...row,id:'evidence-'+String(i).padStart(6,'0')}));
 const paging={prepare(){return {bind(_environment,_commit,offset){return {all:async()=>{if(offset===0)return {results:first};throw Error('D1 partial outage')}}}}}};
 assert.deepEqual(await readTrustedReleaseEvidence({db:paging,deploymentCommit:commit,now:row.event_time,verifiers:{'github-actions':async()=>({verified:true,issuer:row.issuer,artifactDigest:digest})}}),{});
});
