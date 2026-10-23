import {createHash} from 'node:crypto';
import {planWorkforceTask} from './workforce-plan.mjs';
const states=new Set(['planned','review-ready','blocked']);
export function buildWorkforceSimulation(input){
 const plan=planWorkforceTask(input);
 const nodes=plan.steps.map((s,i)=>({
  id:s.id,owner:s.owner,description:s.description,
  dependsOn:i===0?[]:[plan.steps[i-1].id],
  state:s.id==='approval'?'blocked':'planned',
  externalSideEffects:false
 }));
 return {schema:'atlas.workforce.simulation.v1',
  id:createHash('sha256').update(JSON.stringify({title:plan.title,priority:plan.priority,lead:plan.lead})).digest('hex').slice(0,20),
  title:plan.title,lead:plan.lead,priority:plan.priority,risk:plan.risk,
  nodes,mode:'dry-run',approval:'required',execution:'disabled',
  modelCalls:0,networkCalls:0,taskWrites:0,productionTouched:false};
}
export function reviewWorkforceSimulation(sim,completed=[]){
 if(!sim||sim.schema!=='atlas.workforce.simulation.v1'||!Array.isArray(sim.nodes))throw Error('invalid_simulation');
 if(!Array.isArray(completed)||completed.some(x=>typeof x!=='string'))throw Error('invalid_completed_steps');
 const done=new Set(completed);
 if(done.size!==completed.length||completed.some(id=>!sim.nodes.some(n=>n.id===id&&n.id!=='approval')))throw Error('invalid_completed_steps');
 const nodes=sim.nodes.map(node=>{
  if(node.id==='approval')return {...node,state:'blocked'};
  if(done.has(node.id)){
   if(node.dependsOn.some(id=>!done.has(id)))throw Error('dependency_not_satisfied');
   return {...node,state:'review-ready'};
  }
  return {...node,state:'planned'};
 });
 if(nodes.some(n=>!states.has(n.state)))throw Error('invalid_state');
 return {...sim,nodes,approval:'required',execution:'disabled',productionTouched:false};
}
