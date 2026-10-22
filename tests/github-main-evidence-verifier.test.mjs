import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,webcrypto} from 'node:crypto';
import {createGithubMainEvidenceVerifier} from '../lib/github-main-evidence-verifier.mjs';
const repository='example/Team',commit='a'.repeat(40);
const digest=createHash('sha256').update(JSON.stringify({repository,branch:'main',commit})).digest('hex');
const proof={requirement:'merged-main',reference:'https://github.com/example/Team/commit/'+commit,issuer:'github-main',environment:'production',commit,digest};
const response=(sha=commit)=>({ok:true,json:async()=>({name:'main',commit:{sha}})});
test('valid independently read main head and canonical digest verify',async()=>{
 const verify=createGithubMainEvidenceVerifier({repository,apiToken:'test-only',cryptoImpl:webcrypto,fetchImpl:async()=>response()});
 assert.deepEqual(await verify(proof),{verified:true,issuer:'github-main',artifactDigest:digest});
});
test('wrong branch, commit, digest, repository and unsupported requirement fail closed',async()=>{
 const verify=createGithubMainEvidenceVerifier({repository,apiToken:'test-only',cryptoImpl:webcrypto,fetchImpl:async()=>response()});
 for(const patch of [{digest:'b'.repeat(64)},{requirement:'ci'},{commit:'b'.repeat(40)},{reference:'https://github.com/evil/Team/commit/'+commit},{reference:'https://github.com/example/Team/commit/'+'b'.repeat(40)}]){
  assert.equal((await verify({...proof,...patch})).verified,false);
 }
 assert.equal((await createGithubMainEvidenceVerifier({repository,apiToken:'test-only',cryptoImpl:webcrypto,fetchImpl:async()=>response('b'.repeat(40))})(proof)).verified,false);
});
test('network failures and missing credentials fail closed',async()=>{
 const offline=createGithubMainEvidenceVerifier({repository,apiToken:'test-only',cryptoImpl:webcrypto,fetchImpl:async()=>{throw Error('offline')}});
 assert.equal((await offline(proof)).verified,false);
 assert.equal((await createGithubMainEvidenceVerifier({repository,cryptoImpl:webcrypto,fetchImpl:async()=>response()})(proof)).verified,false);
});
