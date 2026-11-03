// Pure schema projection only. Deliberately performs no I/O, accepts no credentials.
// A future Safeguard integration must deliver authenticated read-only data through
// a distinct scoped token, never through the paired sensor command key.
const txt=(v,n=120)=>typeof v==='string'?v.slice(0,n):null;
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
const safeCount=v=>Number.isSafeInteger(v)&&v>=0&&v<=1000000?v:null;
export function projectSafeguardAlerts(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.ok!==true||!Array.isArray(raw.alerts))
  return {ok:false,error:'invalid_alerts_payload'};
 const alerts=raw.alerts.slice(0,100).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map(a=>({
  id:txt(a.id,80),
  title:txt(a.title,120),
  severity:['low','medium','high','critical'].includes(a.severity)?a.severity:'unknown',
  status:['open','acknowledged','resolved'].includes(a.status)?a.status:'unknown',
  type:txt(a.type,80),
  createdAt:iso(a.createdAt),
  updatedAt:iso(a.updatedAt)
 }));
 return {ok:true,source:'safeguard',readOnly:true,alerts,count:alerts.length,truncated:raw.alerts.length>100};
}
export function projectSafeguardEvidence(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.ok!==true||!Array.isArray(raw.chain))
  return {ok:false,error:'invalid_evidence_payload'};
 const integrity=raw.integrity&&typeof raw.integrity==='object'&&raw.integrity.ok===true;
 const chain=raw.chain.slice(-100).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)).map(e=>({
  id:txt(e.id,90),
  sequence:safeCount(e.sequence),
  category:txt(e.category,90),
  source:txt(e.source,90),
  capturedAt:iso(e.capturedAt),
  hash:typeof e.hash==='string'&&/^[0-9a-f]{64}$/i.test(e.hash)?e.hash:null
 }));
 return {ok:true,source:'safeguard',readOnly:true,integrityReported:integrity,count:safeCount(raw.count),records:chain,truncated:raw.chain.length>100};
}
export function emptySafeguardSecurityFeed(){
 return {ok:false,connected:false,reason:'scoped_read_only_feed_not_configured',alerts:[],evidence:[]};
}
