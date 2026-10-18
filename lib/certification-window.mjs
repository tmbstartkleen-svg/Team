// Certification permission is intentionally temporary even if Worker variables
// remain configured. A stale timestamp can never authorize another task.
export function certificationWindowValid(env={},now=Date.now()){
 const raw=env.TEAM_EXECUTOR_CERTIFICATION_EXPIRES_AT;
 if(typeof raw!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(raw))return false;
 const expiry=Date.parse(raw);
 return Number.isFinite(expiry)&&Number.isFinite(now)&&expiry>now&&expiry-now<=15*60*1000;
}
