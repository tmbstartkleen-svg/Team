const BACKEND_PATH=/^\/api\/[a-z0-9-]+\/?$/i;
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  if(!BACKEND_PATH.test(url.pathname))return new Response('Not found',{status:404});
  if(!['GET','POST','OPTIONS'].includes(request.method))return new Response('Method not allowed',{status:405});
  // Temporary compatibility bridge: Cloudflare hosts the UI, existing Vercel
  // functions remain the API origin until they are ported to Cloudflare.
  const upstream=new URL(env.TEAM_API_ORIGIN||'https://team-rho-self.vercel.app');
  if(upstream.protocol!=='https:'||upstream.username||upstream.password||upstream.pathname!=='/'||upstream.search) return new Response('Backend not configured',{status:503});
  const target=new URL(url.pathname+url.search,upstream);
  const headers=new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  let response;
  try{response=await fetch(new Request(target,{method:request.method,headers,body:request.method==='GET'||request.method==='HEAD'?undefined:request.body,redirect:'manual'}));}
  catch{return new Response(JSON.stringify({ok:false,error:'team_backend_unavailable'}),{status:502,headers:{'content-type':'application/json','cache-control':'no-store'}})}
  const safe=new Headers(response.headers);
  safe.delete('set-cookie');
  safe.delete('location');
  safe.delete('access-control-allow-origin');
  safe.set('Cache-Control','no-store');
  safe.set('X-Team-Backend','vercel-standby');
  return new Response(response.body,{status:response.status,headers:safe});
 }
};
