// Canonical signed payload binds every stored security-sensitive field.
// Domain separation prevents reuse of a signature for another protocol.
const allowed=/^[A-Za-z0-9_.:-]{8,128}$/;
export function canonicalSignedAuditPayload(issuer,event){
 if(typeof issuer!=='string'||!allowed.test(issuer)||!event||typeof event!=='object'||Array.isArray(event))throw new TypeError('invalid_signed_audit_payload');
 const keys=Object.keys(event).sort();
 if(keys.length<7||keys.length>20||keys.some(k=>!/^[_A-Za-z][_A-Za-z0-9]{0,63}$/.test(k)))throw new TypeError('invalid_signed_audit_fields');
 const vector=keys.map(k=>{
  const v=event[k];
  if(!['string','boolean'].includes(typeof v)||typeof v==='string'&&v.length>2048)throw new TypeError('invalid_signed_audit_value');
  return [k,v];
 });
 return new TextEncoder().encode(JSON.stringify(['atlas-signed-audit-v2',issuer,vector]));
}
