// Identifies dedicated TEAM storage without mistaking a Worker name for D1.
export function classifyTeamD1Databases(items){
 if(!Array.isArray(items))throw new TypeError('invalid_d1_listing');
 const matches=items.filter(x=>x&&['atlas-team','atlas-team-data'].includes(x.name));
 const canonical=matches.filter(x=>x.name==='atlas-team-data');
 const alternative=matches.filter(x=>x.name==='atlas-team');
 const valid=x=>typeof x.uuid==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x.uuid);
 if(canonical.length>1||alternative.length>1||matches.some(x=>!valid(x)))throw new Error('ambiguous_d1_database');
 if(canonical.length===1)return {status:'reuse',name:'atlas-team-data',uuid:canonical[0].uuid};
 if(alternative.length===1)return {status:'review_existing',name:'atlas-team',uuid:alternative[0].uuid};
 return {status:'create',name:'atlas-team-data',uuid:null};
}
