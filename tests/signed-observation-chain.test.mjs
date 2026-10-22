import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSignedObservationChain} from '../lib/signed-observation-chain.mjs';
const scope={taskId:'safe-task-100',stepId:'safe-step-100',idempotencyKey:'safe-key-100'};
const commit='a'.repeat(40);
const approval={sourceVerified:true,taskId:scope.taskId,stepId:scope.stepId,deploymentCommit:commit,ownerAuthenticated:true,approvedAt:'2026-10-21T19:00:00Z'};
const replay={sourceVerified:true,...scope,deploymentCommit:commit,denied:true,replayObservedAt:'2026-10-21T20:00:00Z'};
const ledger={state:'confirmed',taskId:scope.taskId,stepId:scope.stepId,reservedAt:'2026-10-21 19:30:00'};
test('valid source chronology passes isolated inspection only',async()=>assert.deepEqual(await validateSignedObservationChain({scope,approval,replay,ledger,expectedCommit:commit}),{verified:true}));
test('mismatched commit, early replay, and protected task all fail closed',async()=>{
 for(const e of [{expectedCommit:'b'.repeat(40)},{replay:{...replay,replayObservedAt:'2026-10-21T18:00:00Z'}},{scope:{...scope,taskId:'cert-github-read-20261019-v2'}}]){
  assert.deepEqual(await validateSignedObservationChain({scope,approval,replay,ledger,expectedCommit:commit,...e}),{verified:false});
 }
});
