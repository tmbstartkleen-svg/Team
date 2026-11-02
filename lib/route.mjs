export const ROUTER_VERSION='2.1.0';
export const SPECIALISTS=[
['mba','MBA Business & Academia',['mba','business','academic','academia','marketing','strategy','coursework','case-study','finance']],
['sports-guru','Sports Guru',['sports','sport','moneyline','player','injuries','injury','roster','odds','parlay','props','simulation']],
['al-detector','AL — AI Content Analyst',['detector','authorship','ai-detector','plagiarism','provenance','originality']],
['fsqa-manager','FSQA Manager',['fsqa','haccp','food-safety','listeria','foodborne','audit','traceability','pathogen']],
['sanitation-regional','Regional Sanitation Manager',['sanitation','sanitizer','ssop','industrial','plant','cleaning','regional','staffing']],
['coding-execution','Coding & Execution Lead',['coding','code','execute','execution','debug','offline','programming','automate','backend']],
['program','Program Manager',['milestone','plan','schedule','delivery']],
['data','Data Analyst',['data','analysis','metrics','report']],
['sales','Sales Strategist',['sales','customers','leads','proposal']],
['documentation','Documentation Lead',['documentation','write','guide','manual']],
['architect','Chief Architect',['architecture','system','roadmap','dependency','design']],
['assembler','Team Assembler',['persona','agent','team','workforce','staff']],
['engineer','Software Engineer',['code','software','bug','feature','backend','frontend']],
['designer','Product Designer',['ui','ux','interface','layout','visual','accessibility']],
['qa','QA Engineer',['test','quality','regression','verify','validation']],
['ship','Deployment Engineer',['deploy','vercel','release','production','build','github']],
['model','Model Steward',['model','gpt','llm','routing','inference','provider']],
['offline','Offline Engineer',['offline','local','device','airgap','fallback']],
['integration','Integration Engineer',['connector','integration','webhook','sync','api']],
['security','Security Reviewer',['security','permissions','access','secrets','auth']],
['finance','Financial Analyst',['budget','cost','revenue','finance','pricing']],
['research','Research Director',['research','investigate','evidence','source','market']],
['operations','Operations Manager',['operation','process','workflow','handoff']],
['compliance','Compliance Auditor',['compliance','audit','policy','regulatory']]
].map(([id,name,signals])=>({id,name,signals}));
export function routeTask(task,limit=5){
 const words=new Set(String(task||'').toLowerCase().match(/[a-z0-9-]+/g)||[]);
 const ranked=SPECIALISTS.map(persona=>({id:persona.id,name:persona.name,matched:persona.signals.filter(s=>words.has(s))}))
 .filter(p=>p.matched.length).sort((a,b)=>b.matched.length-a.matched.length||a.name.localeCompare(b.name)).slice(0,Math.max(1,Math.min(10,limit)));
 return {mode:'deterministic-keyword-routing',execution:'not-started',requiresApproval:true,confidence:ranked.length?'keyword-match':'no-signal',recommended:ranked,coverageGap:!ranked.length};
}
