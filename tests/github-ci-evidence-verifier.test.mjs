import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createGithubCiEvidenceVerifier} from '../lib/github-ci-evidence-verifier.mjs';
const repository='example/Team',commit='a'.repeat(40),id=123;
const canonical=JSON.stringify({repository,runId:id,commit,conclusion:'success',event:'push',branch:'main'});
const digest=createHash('sha256').update(canonical).digest('hex');
const proof={requirement:'ci',reference:'https://github.com/example/Team/actions/runs/123',issuer:'github-actions',environment:'production',commit,digest};
const response=(overrides={})=>({ok:true,json:async()=>({id,status:'completed',conclusion:'success',head_sha:commit,repository:{full_name:repository},event:'push',head_branch:'main',...overrides})});
test('accepts matching successful main push with canonical digest',async()=>{
 const verifier=createGithubCiEvidenceVerifier({repository,apiToken:'test-token',fetchImpl:async()=>response()});
 assert.deepEqual(await verifier(proof),{verified:true,issuer:'github-actions',artifactDigest:digest});
});
test('rejects wrong commit, wrong digest, repo mismatch and failed job',async()=>{
 const verifier=createGithubCiEvidenceVerifier({repository,apiToken:'test-token',fetchImpl:async()=>response()});
 for(const changes of [{digest:'b'.repeat(64)},{commit:'b'.repeat(40)},{reference:'https://github.com/evil/Team/actions/runs/123'},{requirement:'real-read-adapter'}]){
  assert.equal((await verifier({...proof,...changes})).verified,false);
 }
 const failed=createGithubCiEvidenceVerifier({repository,apiToken:'token',fetchImpl:async()=>response({conclusion:'failure'})});
 assert.equal((await failed(proof)).verified,false);
});
test('fails closed on network errors or missing credentials',async()=>{
 assert.equal((await createGithubCiEvidenceVerifier({repository,fetchImpl:async()=>response()})(proof)).verified,false);
 const broken=createGithubCiEvidenceVerifier({repository,apiToken:'token',fetchImpl:async()=>{throw Error('offline')}});
 assert.equal((await broken(proof)).verified,false);
});
