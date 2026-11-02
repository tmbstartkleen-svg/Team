// Read-only mirror checker. Does not clone, push, deploy, or delete repositories.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const REPO=/^[A-Za-z0-9_][A-Za-z0-9_.-]*\/[A-Za-z0-9_][A-Za-z0-9_.-]*$/;
export function parseRemoteRefs(output){
 if(typeof output!=='string')throw new TypeError('invalid_refs');
 const refs=new Map();
 for(const line of output.split(/\r?\n/)){
  if(!line.trim())continue;
  const match=/^([0-9a-f]{40})\t(refs\/(?:heads|tags)\/[^\s]+)$/.exec(line);
  if(!match)throw new TypeError('invalid_remote_ref');
  if(refs.has(match[2])&&refs.get(match[2])!==match[1])throw new TypeError('ambiguous_remote_ref');
  refs.set(match[2],match[1]);
 }
 return refs;
}
export function compareMirrorRefs(source,destination){
 if(!(source instanceof Map)||!(destination instanceof Map))throw new TypeError('invalid_ref_maps');
 const missing=[],mismatched=[],extra=[];
 for(const [ref,sha] of source){
  if(!destination.has(ref))missing.push(ref);
  else if(destination.get(ref)!==sha)mismatched.push({ref,source:sha,destination:destination.get(ref)});
 }
 for(const ref of destination.keys())if(!source.has(ref))extra.push(ref);
 return {sourceRefCount:source.size,destinationRefCount:destination.size,
  missing:missing.sort(),mismatched:mismatched.sort((a,b)=>a.ref.localeCompare(b.ref)),extra:extra.sort(),
  exactMatch:missing.length===0&&mismatched.length===0&&extra.length===0};
}
export function validateRepoSlug(value){
 if(typeof value!=='string'||!REPO.test(value)||value.includes('..'))throw new TypeError('invalid_repo_slug');
 return value;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [from,to]=process.argv.slice(2);
 if(!from||!to)throw new Error('usage: npm run audit:mirror -- OWNER/SOURCE OWNER/DESTINATION');
 const src=validateRepoSlug(from),dst=validateRepoSlug(to);
 if(src===dst)throw new Error('source_equals_destination');
 const read=slug=>execFileSync('git',['ls-remote','--heads','--tags','https://github.com/'+slug+'.git'],{
  encoding:'utf8',timeout:15000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']
 });
 const result=compareMirrorRefs(parseRemoteRefs(read(src)),parseRemoteRefs(read(dst)));
 process.stdout.write(JSON.stringify({sourceRepo:src,destinationRepo:dst,...result},null,2)+'\n');
 if(!result.exactMatch)process.exitCode=2;
}
