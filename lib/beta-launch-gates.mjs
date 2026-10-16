// Evaluate launch gates without conflating infrastructure with working AI personas.
export function betaLaunchGates(evidence={}){
 const gates=[
  ['cloudflareHosting','Cloudflare hosting verified'],
  ['d1Schema','Dedicated D1 binding and schema verified'],
  ['ownerAuthenticated','Owner authentication tested end-to-end'],
  ['collaborationWriteRead','Authenticated collaboration write/read and privacy tested'],
  ['agentExecution','Approved AI agent performs and verifies a real task'],
  ['securityCertification','Production security and recovery checks passed']
 ];
 const results=gates.map(([id,label])=>({id,label,verified:evidence[id]===true}));
 return {ready:results.every(x=>x.verified),verified:results.filter(x=>x.verified).length,total:results.length,gates:results};
}
