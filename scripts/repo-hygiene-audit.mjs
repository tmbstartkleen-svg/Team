import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
// Read-only repository hygiene check. Does not delete, rewrite or upload files.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function isGeneratedOrSensitivePath(path){
 if(typeof path!=='string')return false;
 const segments=path.split('/');
 if(segments.some(x=>['node_modules','.vercel','.wrangler','.turbo','.sentinel-data','.nyc_output'].includes(x)))return true;
 // Source routes may legitimately contain a /coverage/ segment.
 if(segments[0]==='coverage')return true;
 const base=segments.at(-1);
 if(base==='.DS_Store'||base==='Thumbs.db'||base==='.env'||base?.startsWith('.env.')&&base!=='.env.example'||base==='.dev.vars'||base?.startsWith('.dev.vars.'))return true;
 if(/\.(?:log|tmp|temp|pem|key)$/i.test(base||''))return true;
 return false;
}
export function auditTrackedFiles(paths,readFile){
 const forbidden=[],identical=[];
 const hashMap=new Map();
 for(const path of paths){
  if(isGeneratedOrSensitivePath(path))forbidden.push(path);
  const hash=createHash('sha256').update(readFile(path)).digest('hex');
  const old=hashMap.get(hash);
  if(old)identical.push([old,path]);else hashMap.set(hash,path);
 }
 return {trackedFiles:paths.length,forbidden,identical};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const names=execFileSync('git',['ls-files','--cached','-z'],{maxBuffer:16*1024*1024}).toString('utf8').split('\0').filter(Boolean);
 const report=auditTrackedFiles(names,path=>readFileSync(path));
 process.stdout.write(JSON.stringify(report,null,2)+'\n');
 if(report.forbidden.length)process.exitCode=1;
}
