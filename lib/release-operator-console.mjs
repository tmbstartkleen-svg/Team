// Public read-only command center. Rendering is deliberately separate from execution APIs.
export function renderReleaseOperatorConsole(){
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ATLAS TEAM | Release Command Center</title><style>
:root{color-scheme:dark;font:16px system-ui,sans-serif;background:#0c1420;color:#e9eef8}
body{max-width:1200px;margin:auto;padding:30px 20px}header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
h1{margin:8px 0;font-size:2rem}p{color:#b1bfd1;line-height:1.5}.pill{border:1px solid #526177;border-radius:30px;padding:8px 12px}
.panel{background:#192537;border:1px solid #34445a;border-radius:16px;padding:20px;margin:16px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(245px,1fr));gap:14px}
article{border:1px solid #3b4c65;border-radius:12px;padding:14px;background:#202e40}
article h3{font-size:1rem;margin:0 0 10px}.muted{color:#aebfd5}.bad{color:#ffcf97}.ok{color:#9be3b7}
button{background:#286ad0;color:white;border:none;border-radius:9px;padding:12px 16px;cursor:pointer;font:inherit}
button:focus-visible,a:focus-visible{outline:3px solid #ffe08b}
a{color:#a7d0ff}ul{line-height:1.8}.metric{font-size:2rem;font-weight:750}
</style></head><body>
<header><div><div class="muted">ATLAS TEAM / OWNER RELEASE REVIEW</div><h1>Release Command Center</h1></div>
<div class="pill">READ ONLY · NO EXECUTION</div></header>
<p>Live configuration checks and certification evidence are different. This screen never authorizes tools, merges code, or releases agents.</p>
<div class="grid"><section class="panel"><div class="muted">Certified milestones</div><div class="metric" id="milestones">—</div></section>
<section class="panel"><div class="muted">Production agent status</div><div class="metric" id="operation">Not verified</div></section>
<section class="panel"><div class="muted">Required API gates open</div><div class="metric" id="gates">—</div></section></div>
<button id="refresh" type="button">Refresh evidence</button><p id="status" role="status" aria-live="polite">Not yet loaded.</p>
<section class="panel"><h2>Five owner-controlled milestones</h2><div class="grid" id="milestone-list"></div></section>
<section class="panel"><h2>Production readiness conditions</h2><div class="grid" id="gate-list"></div></section>
<section class="panel"><h2>Operator safeguards</h2><ul>
<li>Certification task <code>cert-github-read-20261019-v2</code> remains unapproved and unexecuted.</li>
<li>Prior ambiguous execution records must not be replayed or erased.</li>
<li>Neither CI success nor credential configuration is a verified receipt.</li>
<li>Final owner signoff is always separate from this screen.</li></ul>
<p><a href="https://github.com/tmbstartkleen-svg/Team/issues/91">Review release blocker #91</a></p></section>
<script>
const byId=id=>document.getElementById(id);
const item=(title,subtitle,passed)=>{const card=document.createElement('article'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=subtitle;p.className=passed?'ok':'bad';card.append(h,p);return card};
async function refresh(){
 byId('status').textContent='Retrieving read-only evidence…';
 try{
  const response=await fetch('/api/release-evidence-dashboard',{method:'GET',cache:'no-store',credentials:'omit'});
  if(!response.ok)throw Error('Evidence service unavailable');
  const data=await response.json();
  if(data.ok!==true||data.readOnly!==true||!Array.isArray(data.certificationMilestones)||!Array.isArray(data.gates))throw Error('Invalid evidence response');
  const safeActive=data.launchAuthorized===true&&data.productionOperational===true;
  byId('milestones').textContent=(data.certificationMilestones.length-data.remainingMilestones)+' / '+data.certificationMilestones.length;
  byId('operation').textContent=safeActive?'Certified':'Inactive';
  byId('gates').textContent=String(data.requiredGatesOpen.length);
  byId('milestone-list').replaceChildren(...data.certificationMilestones.map(m=>item(m.title,m.certified?'Evidence verified':'Missing: '+m.missingEvidence.join(', '),m.certified)));
  byId('gate-list').replaceChildren(...data.gates.map(g=>item(g.id,(g.ready?'Ready':'Incomplete')+(g.required?' · required':' · optional'),g.ready)));
  byId('status').textContent='Read-only evidence loaded. No authorization or execution action taken.';
 }catch{
  byId('milestones').textContent='—';byId('operation').textContent='Not verified';byId('gates').textContent='—';
  byId('milestone-list').replaceChildren();byId('gate-list').replaceChildren();
  byId('status').textContent='Evidence unavailable. Release status remains blocked.';
 }
}
byId('refresh').addEventListener('click',refresh);refresh();
</script></body></html>`;
}
export function handleReleaseOperatorConsole(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{allow:'GET','cache-control':'no-store'}});
 return new Response(renderReleaseOperatorConsole(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}
