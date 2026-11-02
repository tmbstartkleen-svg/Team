// Consumes the proposed Safeguard /api/atlas-read v1 response, without any I/O.
// This is not an authorization mechanism; upstream transport must be authenticated.
import {projectSafeguardAlerts} from './safeguard-security-feed-projection.mjs';
const txt=(v,n=100)=>typeof v==='string'?v.slice(0,n):null;
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null;
export function projectAtlasSecurityExport(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.ok!==true||raw.schema!=='atlas-security-read-v1'||
 raw.readOnly!==true||raw.source!=='safeguard'||!Array.isArray(raw.alerts)||raw.alerts.length>100||
 !raw.evidence||typeof raw.evidence!=='object'||Array.isArray(raw.evidence)||
 !Array.isArray(raw.evidence.records)||raw.evidence.records.length>100||
 !Number.isSafeInteger(raw.evidence.count)||raw.evidence.count<raw.evidence.records.length||
 raw.evidence.count<0||raw.evidence.count>1000000||
 (raw.alertsTruncated!==undefined&&typeof raw.alertsTruncated!=='boolean')||
 (raw.evidenceTruncated!==undefined&&typeof raw.evidenceTruncated!=='boolean'))
  return {ok:false,connected:false,reason:'invalid_safeguard_export'};
 const a=projectSafeguardAlerts({ok:true,alerts:raw.alerts});
 if(!a.ok)return {ok:false,connected:false,reason:'invalid_safeguard_export'};
 const evidence=raw.evidence.records.slice(-100).map(x=>({
   id:txt(x?.id,90),
   sequence:Number.isSafeInteger(x?.sequence)&&x.sequence>=0?x.sequence:null,
   source:txt(x?.source,90),category:txt(x?.category,90),
   capturedAt:iso(x?.capturedAt),
   hash:typeof x?.hash==='string'&&/^[a-f0-9]{64}$/i.test(x.hash)?x.hash:null
 }));
 return {ok:true,connected:true,source:'safeguard',readOnly:true,alerts:a.alerts,evidence,
  alertCount:a.alerts.length,evidenceCount:Number.isSafeInteger(raw.evidence.count)&&raw.evidence.count>=0?raw.evidence.count:null,
  alertDataTruncated:raw.alertsTruncated===true,evidenceDataTruncated:raw.evidenceTruncated===true,
  integrity:'not_independently_verified'};
}
