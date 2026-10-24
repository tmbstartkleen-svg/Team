// Normalize ATLAS D1 UTC timestamps and signed ISO instants. Missing or
// ambiguous timestamp formats block certification rather than being guessed.
const iso=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const sqlite=/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
export function parseAuditInstant(value){
 if(typeof value!=='string')return NaN;
 const canonical=sqlite.test(value)?value.replace(' ','T')+'Z':value;
 if(!iso.test(canonical))return NaN;
 const t=Date.parse(canonical);
 return Number.isFinite(t)?t:NaN;
}
export function auditChronologyValid({approvedAt,reservedAt,replayObservedAt}={}){
 const [a,b,c]=[approvedAt,reservedAt,replayObservedAt].map(parseAuditInstant);
 return [a,b,c].every(Number.isFinite)&&a<b&&b<c;
}
