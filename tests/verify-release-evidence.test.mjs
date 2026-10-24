import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const sha='ae8e51878898';
const health={environment:'preview',productionOperational:false,releaseCommit:sha,
 configuration:{operatorSecretPresent:true},executionConfigured:false,
 stagingDatabase:{enabled:true,connected:true,schemaReady:true,tables:{projects:true,tasks:true,events:true}},
 capabilities:{modelExecution:'disabled',autonomousAgents:false},
 releaseChecks:{liveWorkflowVerified:false,minimumConfigurationPresent:false},edge:{certified:false}};
const evidence={ok:true,environment:'preview',releaseCommit:sha,
 taskId:'abe00ce2-94ea-4cae-b0a5-1dc554a29014',taskStatus:'queued',approval:'rejected',
 duplicateDecisionStatus:409,auditEvents:['task.created','task.rejected'],
 modelExecution:'not called',productionTouched:false};
function run(h=health,e=evidence,commit=sha){
 const dir=mkdtempSync(join(tmpdir(),'atlas-evidence-'));
 try{
 const hp=join(dir,'health.json'),ep=join(dir,'evidence.json');
 writeFileSync(hp,JSON.stringify(h));writeFileSync(ep,JSON.stringify(e));
 const result=spawnSync(process.execPath,['scripts/verify-release-evidence.mjs','--health',hp,'--evidence',ep,'--commit',commit],{encoding:'utf8'});
 return {status:result.status,json:JSON.parse(result.stdout)};
 }finally{rmSync(dir,{recursive:true,force:true})}
}
test('complete commit-scoped evidence is classified for staging, never production',()=>{
 const r=run();assert.equal(r.status,0);
 assert.equal(r.json.stagingEvidenceComplete,true);assert.equal(r.json.productionLaunchReady,false);
 assert.equal(r.json.productionApprovalGranted,false);assert.equal(r.json.networkCalls,0);assert.equal(r.json.taskWrites,0);
});
test('unmatched commit or missing duplicate HTTP result fails closed',()=>{
 for(const [h,e,sha] of [[health,evidence,'000000000000'],[health,{...evidence,duplicateDecisionStatus:200},'ae8e51878898'],
  [{...health,environment:'production'},evidence,'ae8e51878898']]){
 const r=run(h,e,sha);assert.equal(r.status,1);assert.equal(r.json.stagingEvidenceComplete,false);
 }
});
test('historical proof cannot certify a later deployment',()=>{
 const r=run({...health,releaseCommit:'556e3925bf56'},evidence,'556e3925bf56');
 assert.equal(r.status,1);assert.equal(r.json.stagingEvidenceComplete,false);
});
