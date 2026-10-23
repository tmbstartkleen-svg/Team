import {spawnSync} from 'node:child_process';
const marker='__ATLAS_HTTP_STATUS__';
export function vercelRequest({base,path,method='GET',body,token,runner=spawnSync}) {
 const url=new URL(path,base);
 if(url.origin!==new URL(base).origin || !url.hostname.endsWith('.vercel.app')) throw Error('unexpected_preview_target');
 const args=['--no-install','vercel@65.2.0','curl',url.pathname+url.search,'--deployment',base,
  '--silent','--show-error','--max-time','15','-X',method,
  '-H','Authorization: Bearer '+token,'-H','Content-Type: application/json',
  '-w','\\n'+marker+':%{http_code}'];
 if(body!==undefined) args.push('--data-raw',body);
 const res=runner('npx',args,{encoding:'utf8',timeout:25000,maxBuffer:1024*1024});
 if(res.error||res.status!==0) throw Error('vercel_cli_request_failed');
 const raw=String(res.stdout||'');
 const pos=raw.lastIndexOf('\n'+marker+':');
 if(pos<0) throw Error('vercel_cli_status_missing');
 const status=Number(raw.slice(pos+marker.length+2).trim());
 if(!Number.isInteger(status)||status<100||status>599) throw Error('vercel_cli_status_invalid');
 let parsed={};
 try{parsed=JSON.parse(raw.slice(0,pos).trim())}catch{
  if(status>=200&&status<300) throw Error('vercel_cli_json_missing');
 }
 return {status,body:parsed};
}
