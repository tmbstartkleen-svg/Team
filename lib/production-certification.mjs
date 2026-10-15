// A release cannot be certified by version number or green unit tests alone.
export const PRODUCTION_GATES=Object.freeze([
 {id:'cloudflare-published',label:'Cloudflare Worker published and endpoint reachable'},
 {id:'database-live',label:'Dedicated persistent database provisioned and migrated'},
 {id:'owner-auth',label:'Authenticated owner identity and server-enforced authorization'},
 {id:'agent-execution',label:'Live agent execution, retries, approvals and recovery tested'},
 {id:'team-messaging',label:'Persistent persona project chat and private owner escalation verified'},
 {id:'ai-runtime',label:'AI provider available with authorized tool and memory access'},
 {id:'secrets',label:'Secret storage, rotation and least-privilege permissions checked'},
 {id:'end-to-end',label:'Production end-to-end and failure recovery tests passed'},
 {id:'observability',label:'Logging, monitoring and actionable alerts configured'}
]);
export function certifyProduction(evidence={}){
 const checks=PRODUCTION_GATES.map(g=>{const e=evidence[g.id];const passed=Boolean(e&&e.passed===true&&typeof e.proof==='string'&&e.proof.trim().length>=8);return {...g,passed,proof:passed?e.proof:null}});
 return {certified:checks.every(x=>x.passed),status:checks.every(x=>x.passed)?'ready-for-owner-release-approval':'blocked',ownerReleaseApprovalRequired:true,checks,passed:checks.filter(x=>x.passed).length,total:checks.length};
}
