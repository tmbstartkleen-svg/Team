import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRemoteRefs,compareMirrorRefs,validateRepoSlug} from '../scripts/verify-mirror.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
test('exactly copied branch and tag refs match',()=>{
 const txt=a+'\trefs/heads/main\n'+b+'\trefs/tags/v1.0.0\n';
 const map=parseRemoteRefs(txt);assert.equal(map.size,2);
 assert.equal(compareMirrorRefs(map,new Map(map)).exactMatch,true);
});
test('annotated tag peeled refs are ignored; tag object SHA stays authoritative',()=>{
 const output=a+'\trefs/heads/main\n'+b+'\trefs/tags/v1\n'+a+'\trefs/tags/v1^{}\n';
 const refs=parseRemoteRefs(output);
 assert.equal(refs.size,2);
 assert.equal(refs.get('refs/tags/v1'),b);
 const other=parseRemoteRefs(a+'\trefs/heads/main\n'+a+'\trefs/tags/v1\n'+a+'\trefs/tags/v1^{}\n');
 assert.equal(compareMirrorRefs(refs,other).exactMatch,false);
});
test('missing, mismatched and extra refs are reported without writes',()=>{
 const left=new Map([['refs/heads/main',a],['refs/tags/v1',b]]);
 const right=new Map([['refs/heads/main',b],['refs/heads/test',a]]);
 const r=compareMirrorRefs(left,right);
 assert.deepEqual(r.missing,['refs/tags/v1']);assert.equal(r.mismatched.length,1);
 assert.deepEqual(r.extra,['refs/heads/test']);assert.equal(r.exactMatch,false);
});
test('empty or branchless remote listings fail closed',()=>{
 assert.throws(()=>compareMirrorRefs(new Map(),new Map()),/empty_remote_refs/);
 assert.throws(()=>compareMirrorRefs(new Map([['refs/heads/main','a'.repeat(40)]]),new Map()),/empty_remote_refs/);
 assert.throws(()=>compareMirrorRefs(new Map([['refs/tags/v1','a'.repeat(40)]]),new Map([['refs/tags/v1','a'.repeat(40)]])),/main_ref_missing/);
});
test('reject untrusted repo URLs, options, and malformed refs',()=>{
 for(const s of ['https://github.com/x/y','-help/x','owner/repo.git?token=1','../../bad','x/..','x'])assert.throws(()=>validateRepoSlug(s));
 assert.equal(validateRepoSlug('tmbstartkleen-svg/Team'),'tmbstartkleen-svg/Team');
 assert.throws(()=>parseRemoteRefs('bad-ref-data'),/invalid_remote_ref/);
});
