import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCertificationLeaseRecovery} from '../lib/certification-lease-recovery-api.mjs';
const token='cert-executor-token-'.repeat(3),taskId='cert-expired-task-001';
const url='https://team.example/api/internal-certification-lease-recovery';
const request=(body={taskId,confirm:'QUARANTINE-EXPIRED-CERT-LEASE'},auth='Bearer '+token)=>new Request(url,{method:'POST',headers:{authorization:auth,'content-type':'application/json'},body:JSON.stringify(body)});
const fixture=(leaseUntil='2000-01-01T00:00:00Z')=>{
 const mutations=[];
 const env={TEAM_EXECUTOR_TOKEN:token,TEAM_EXECUTOR_CERTIFICATION_MODE:'true',TEAM_EXECUTOR_ENABLED:'true',TEAM_EXECUTOR_CERTIFICATION_TASK_ID:taskId,TEAM_DB:{prepare(sql){return {bind(...args){return {first:async()=>{if(sql.startsWith('SELECT'))return {state:'running',owner_approved:1,lease_token:'long-expired-lease-token',lease_until:leaseUntil,attempt_count:1};mutations.push({sql,args});return {state:'blocked'};}}}}}}};
 return {env,mutations};
};
test('recovery refuses anonymous requests',async()=>{const f=fixture();const res=await handleCertificationLeaseRecovery(request(undefined,'Bearer incorrect'),f.env);assert.equal(res.status,401);assert.equal(f.mutations.length,0)});
test('only exact pinned task can recover',async()=>{const f=fixture();const res=await handleCertificationLeaseRecovery(request({taskId:'cert-another-task-001',confirm:'QUARANTINE-EXPIRED-CERT-LEASE'}),f.env);assert.equal(res.status,403);assert.equal(f.mutations.length,0)});
test('no recovery while general release enabled or cert mode disabled',async()=>{const f=fixture();assert.equal((await handleCertificationLeaseRecovery(request(),{...f.env,TEAM_EXECUTOR_GENERAL_RELEASED:'true'})).status,503);assert.equal((await handleCertificationLeaseRecovery(request(),{...f.env,TEAM_EXECUTOR_CERTIFICATION_MODE:undefined})).status,503);assert.equal(f.mutations.length,0)});
test('unexpired lease is never mutated',async()=>{const f=fixture('2099-01-01T00:00:00Z');const res=await handleCertificationLeaseRecovery(request(),f.env);assert.equal(res.status,409);assert.equal(f.mutations.length,0)});
test('expired exact lease is quarantined for owner review, no retry',async()=>{const f=fixture();const res=await handleCertificationLeaseRecovery(request(),f.env);assert.equal(res.status,200);const body=await res.json();assert.equal(body.state,'blocked');assert.equal(body.requiresOwnerReview,true);assert.equal(body.executionTriggered,false);assert.equal(f.mutations.length,1);assert.match(f.mutations[0].sql,/lease-expired/)});
test('explicit confirmation is required',async()=>{const f=fixture();const res=await handleCertificationLeaseRecovery(request({taskId,confirm:'yes'}),f.env);assert.equal(res.status,403);assert.equal(f.mutations.length,0)});
