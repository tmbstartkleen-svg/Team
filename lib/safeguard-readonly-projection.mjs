// Pure read-only Safeguard-to-ATLAS status projection. No network calls.
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;
const text=x=>typeof x==='string'?x.slice(0,32):null;
export function projectHealth(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||x.service!=='safeguard')return {ok:false,reason:'invalid_health'};
 return {ok:x.ok===true,service:'safeguard',version:text(x.version),timestamp:iso(x.timestamp),ready:x.ready===true};
}
export function projectSensor(x){
 if(!x||typeof x!=='object'||Array.isArray(x)||x.ok!==true)return {ok:false,reason:'invalid_sensor'};
 const lastSeen=iso(x.lastSeen);
 return {ok:true,connected:x.connected===true&&lastSeen!==null,lastSeen,version:text(x.version),ageMs:Number.isSafeInteger(x.ageMs)&&x.ageMs>=0?x.ageMs:null};
}
export function projectSnapshot({health,sensor}={}){
 const h=projectHealth(health),s=projectSensor(sensor);
 return {source:'safeguard',mode:'read-only',health:h,sensor:s,operational:h.ok===true&&h.ready===true&&s.ok===true&&s.connected===true};
}
