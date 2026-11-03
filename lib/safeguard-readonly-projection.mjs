// Pure read-only Safeguard-to-ATLAS status projection. No network calls or secrets.
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const text=x=>typeof x==='string'?x.slice(0,32):null;
export const MAX_HEARTBEAT_AGE_MS=5*60*1000;
export function projectHealth(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||x.service!=='safeguard')return {ok:false,reason:'invalid_health'};
 return {ok:x.ok===true,service:'safeguard',version:text(x.version),timestamp:iso(x.timestamp),ready:x.ready===true};
}
export function projectSensor(x,{now=Date.now()}={}){
 if(!x||typeof x!=='object'||Array.isArray(x)||x.ok!==true)return {ok:false,reason:'invalid_sensor'};
 const lastSeen=iso(x.lastSeen);
 const seenMs=lastSeen===null?NaN:Date.parse(lastSeen);
 // Both timestamp and upstream connection status must be current. A future or stale
 // heartbeat cannot prove that a sensor is online, even if upstream says connected.
 const ageMs=Number.isFinite(seenMs)?now-seenMs:null;
 const fresh=ageMs!==null&&ageMs>=0&&ageMs<=MAX_HEARTBEAT_AGE_MS;
 const connected=x.connected===true&&fresh;
 return {ok:true,connected,lastSeen,version:text(x.version),ageMs:ageMs!==null&&ageMs>=0?ageMs:null,fresh};
}
export function projectSnapshot({health,sensor}={},options={}){
 const h=projectHealth(health),s=projectSensor(sensor,options);
 return {source:'safeguard',mode:'read-only',health:h,sensor:s,operational:h.ok===true&&h.ready===true&&s.ok===true&&s.connected===true};
}
