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
<section class="panel"><h2>Authenticated owner workspace</h2><p>Optional owner-only project snapshot. Uses the existing authenticated read-only workspace API. The token is never stored, sent to another origin, or placed in a URL.</p>
<label for="owner-token">Owner token (session-only input)</label> <input id="owner-token" type="password" autocomplete="off" placeholder="Owner API token"><button id="owner-load" type="button">Load owner projects</button><button id="owner-clear" type="button">Clear owner view</button>
<p id="owner-status" role="status" aria-live="polite">Not connected.</p><div id="owner-projects" class="grid"></div></section>
<section class="panel"><h2>Production reliability and recovery</h2>
<p>Live readiness indicators, not proof of recovery drills. A missing check is never displayed as certified.</p>
<div class="grid" id="reliability-list"></div>
<p id="reliability-note" class="muted">Recovery drills, monitoring alarms, and rollback evidence require independent certification.</p></section>
<section class="panel"><h2>Owner-only task and approval audit</h2>
<p>Read-only task preflight plus durable approval history. Enter credentials for each inspection; no token is saved.</p>
<label for="audit-task-id">Task ID</label> <input id="audit-task-id" autocomplete="off" value="cert-github-read-20261019-v2">
<label for="audit-token">Owner token</label> <input id="audit-token" type="password" autocomplete="off">
<button id="audit-load" type="button">Inspect task</button>
<p id="audit-status" role="status" aria-live="polite">No task inspected.</p>
<div id="audit-task" class="grid"></div><div id="audit-history" class="grid"></div></section>
<section class="panel"><h2>Executive release decision</h2>
<p>Release remains blocked unless independently verified evidence and owner authorization are present. This panel creates no signoff.</p>
<div id="decision" class="panel" role="status" aria-live="polite">Not verified. Release blocked.</div>
<h3>Missing certification evidence</h3><div id="evidence-list" class="grid"></div>
<h3>Owner release sequence</h3><ol>
<li>Review authenticated live read receipts and evidence.</li>
<li>Separately authorize and verify any write actions.</li>
<li>Verify multiple personas with durable execution receipts.</li>
<li>Verify production recovery, security, monitoring and rollback.</li>
<li>Record explicit final owner signoff only after all independent checks pass.</li>
</ol><p><a href="https://github.com/tmbstartkleen-svg/Team/issues/91">Release gate Issue #91</a> · <a href="https://github.com/tmbstartkleen-svg/Team/pull/143">Development PR #143</a></p></section>
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
  if(data.ok!==true||data.readOnly!==true||!Array.isArray(data.certificationMilestones)||!Array.isArray(data.gates)||!Array.isArray(data.requiredGatesOpen)||!Number.isInteger(data.remainingMilestones)||data.remainingMilestones<0||data.remainingMilestones>data.certificationMilestones.length)throw Error('Invalid evidence response');
  const safeActive=data.launchAuthorized===true&&data.productionOperational===true;
  byId('milestones').textContent=(data.certificationMilestones.length-data.remainingMilestones)+' / '+data.certificationMilestones.length;
  byId('operation').textContent=safeActive?'Certified':'Inactive';
  byId('gates').textContent=String(data.requiredGatesOpen.length);
  byId('milestone-list').replaceChildren(...data.certificationMilestones.map(m=>item(m.title,m.certified?'Evidence verified':'Missing: '+m.missingEvidence.join(', '),m.certified)));
  byId('gate-list').replaceChildren(...data.gates.map(g=>item(g.id,(g.ready?'Ready':'Incomplete')+(g.required?' · required':' · optional'),g.ready)));
  const byGate=new Map(data.gates.map(g=>[g.id,g.ready===true]));
  const evidence=new Set(Array.isArray(data.releaseEvidence?.missing)?data.releaseEvidence.missing:[]);
  const reliability=[
   ['D1 database binding',byGate.get('database-binding')===true,'Database binding check'],
   ['D1 schema readiness',byGate.get('database-schema')===true&&byGate.get('executor-database-schema')===true,'Application and executor schema checks'],
   ['Persistent recovery configuration',byGate.get('persistent-task-recovery')===true,'Configuration only; drill receipt still required'],
   ['Recovery certification receipt',!evidence.has('durable-recovery')&&data.releaseEvidence?.verified>0,'Separate trusted evidence needed'],
   ['Monitoring certification receipt',!evidence.has('monitoring')&&data.releaseEvidence?.verified>0,'Separate trusted evidence needed'],
   ['Rollback certification receipt',!evidence.has('rollback')&&data.releaseEvidence?.verified>0,'Separate trusted evidence needed']
  ];
  byId('reliability-list').replaceChildren(...reliability.map(([name,ok,description])=>item(name,(ok?'Reported ready':'Unverified')+' · '+description,ok)));
  const approved=safeActive&&data.certificationStatus==='operational'&&data.remainingMilestones===0&&data.requiredGatesOpen.length===0;
  byId('decision').textContent=approved?'Operational evidence reported. Final owner confirmation still required.':'NOT CERTIFIED · Owner signoff pending · '+data.remainingMilestones+' certification milestones open.';
  byId('evidence-list').replaceChildren(...(Array.isArray(data.releaseEvidence?.missing)?data.releaseEvidence.missing:[]).map(k=>item(String(k),'Trusted evidence receipt missing',false)));
  byId('status').textContent='Read-only evidence loaded. No authorization or execution action taken.';
 }catch{
  byId('milestones').textContent='—';byId('operation').textContent='Not verified';byId('gates').textContent='—';
  byId('milestone-list').replaceChildren();byId('gate-list').replaceChildren();byId('evidence-list').replaceChildren();byId('decision').textContent='Evidence unavailable. Release blocked.';byId('reliability-list').replaceChildren();
  byId('status').textContent='Evidence unavailable. Release status remains blocked.';
 }
}
function clearOwner(){
 byId('owner-token').value='';byId('owner-projects').replaceChildren();
 byId('owner-status').textContent='Owner view cleared. No token retained.';
}
async function loadOwner(){
 const input=byId('owner-token'),token=input.value;
 input.value='';
 byId('owner-projects').replaceChildren();
 if(token.length<32){byId('owner-status').textContent='Owner token required. No private data loaded.';return}
 byId('owner-status').textContent='Loading authenticated read-only project status…';
 try{
  const r=await fetch('/api/owner-workspace',{method:'GET',headers:{authorization:'Bearer '+token},credentials:'omit',cache:'no-store',redirect:'error'});
  if(!r.ok)throw Error('Owner authorization or workspace unavailable');
  const data=await r.json();
  if(data.ok!==true||!Array.isArray(data.projects)||data.agentExecutionActive!==false)throw Error('Unverified owner workspace response');
  const projects=data.projects.slice(0,100);
  byId('owner-projects').replaceChildren(...projects.map(p=>item(String(p.title||'Untitled project').slice(0,160),'Project status: '+String(p.status||'unknown').slice(0,40),false)));
  byId('owner-status').textContent=projects.length+' projects loaded from authenticated workspace. Agents remain uncertified.';
 }catch{byId('owner-status').textContent='Could not verify owner workspace. No private status displayed.'}
}
async function inspectTask(){
 const taskId=byId('audit-task-id').value.trim(),input=byId('audit-token'),token=input.value;
 input.value='';byId('audit-task').replaceChildren();byId('audit-history').replaceChildren();
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(taskId)||token.length<32){byId('audit-status').textContent='Valid task ID and owner token required.';return}
 byId('audit-status').textContent='Loading owner-authorized inspection…';
 try{
  const headers={authorization:'Bearer '+token};
  const opts={method:'GET',headers,cache:'no-store',credentials:'omit',redirect:'error'};
  const [pre,audit]=await Promise.all([
   fetch('/api/owner-task-preflight?taskId='+encodeURIComponent(taskId),opts),
   fetch('/api/owner-approval-history?taskId='+encodeURIComponent(taskId),opts)
  ]);
  if(!pre.ok||!audit.ok)throw Error('inspection unavailable');
  const [task,history]=await Promise.all([pre.json(),audit.json()]);
  if(task.ok!==true||history.ok!==true||task.taskId!==taskId||history.taskId!==taskId||!Array.isArray(history.decisions)||task.executionStarted!==false)throw Error('mismatched inspection');
  byId('audit-task').replaceChildren(
   item('Task state',String(task.state||'unknown'),false),
   item('Owner approval',task.ownerApproved===true?'Approved in task record':'Not approved',task.ownerApproved===true),
   item('Execution gate',task.claimable===true?'Claimable (not executed)':'Not claimable',false),
   item('Attempts',String(task.attemptCount??'unknown'),false)
  );
  byId('audit-history').replaceChildren(...history.decisions.slice(0,50).map(d=>item(String(d.decision||'Recorded decision').slice(0,80),'Recorded at: '+String(d.created_at||'unknown').slice(0,80),false)));
  byId('audit-status').textContent='Inspection loaded. No task claimed, approved, executed or replayed.';
 }catch{byId('audit-status').textContent='Inspection unavailable or unauthorized. No claim or approval performed.'}
}
byId('audit-load').addEventListener('click',inspectTask);
byId('owner-load').addEventListener('click',loadOwner);
byId('owner-clear').addEventListener('click',clearOwner);
byId('refresh').addEventListener('click',refresh);refresh();
</script></body></html>`;
}
export function handleReleaseOperatorConsole(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{allow:'GET','cache-control':'no-store'}});
 return new Response(renderReleaseOperatorConsole(),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}
