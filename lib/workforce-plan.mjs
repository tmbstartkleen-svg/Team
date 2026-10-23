import {routeTask,SPECIALISTS} from './route.mjs';
const validPriorities=new Set(['low','medium','high','critical']);
const risky=/\b(deploy|production|merge|delete|execute|send|purchase|transfer|approve|payment|credential|secret|publish)\b/i;
export function planWorkforceTask(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('invalid_task');
 const title=input.title;
 if(typeof title!=='string'||title.trim().length<3||title.length>240)throw Error('invalid_title');
 const priority=input.priority??'medium';
 if(!validPriorities.has(priority))throw Error('invalid_priority');
 const routing=routeTask(title,5);
 const requested=input.persona;
 if(requested!==undefined&&(typeof requested!=='string'||!SPECIALISTS.some(p=>p.name===requested)))throw Error('invalid_persona');
 const lead=requested?SPECIALISTS.find(p=>p.name===requested):SPECIALISTS.find(p=>p.id===routing.recommended[0]?.id);
 const sensitive=risky.test(title);
 const steps=[
  {id:'intake',owner:'Program Manager',description:'Confirm scope and constraints',status:'planned'},
  {id:'research',owner:lead?.name||'Chief Architect',description:'Prepare evidence and proposed work',status:'planned'},
  {id:'review',owner:'QA Engineer',description:'Check evidence, policy, and test plan',status:'planned'},
  {id:'approval',owner:'Human Owner',description:'Explicit human authorization required for any execution',status:'blocked'}
 ];
 if(sensitive)steps.splice(3,0,{id:'security',owner:'Security Reviewer',description:'Assess privileged or external side effects',status:'planned'});
 return {schema:'atlas.workforce.plan.v1',title:title.trim(),priority,
  lead:lead?.name||null,coverageGap:!lead,routing,
  risk:sensitive?'sensitive':'standard',steps,
  execution:'not-started',approval:'required',modelCalls:0,
  networkCalls:0,taskWrites:0,externalActions:0,
  productionTouched:false,agentExecutionEnabled:false};
}
