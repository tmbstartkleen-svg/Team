import {routeTask,SPECIALISTS} from './route.mjs';
const STAGES=[
 {id:'scope',name:'Scope and requirements',role:'Chief Architect',dependsOn:[]},
 {id:'research',name:'Evidence and feasibility',role:'Research Director',dependsOn:['scope']},
 {id:'design',name:'Solution design',role:'Product Designer',dependsOn:['research']},
 {id:'implement',name:'Implementation plan',role:'Software Engineer',dependsOn:['design']},
 {id:'verify',name:'Test and security review',role:'QA Engineer',dependsOn:['implement']},
 {id:'release',name:'Controlled release review',role:'Deployment Engineer',dependsOn:['verify']}
];
export function buildPlan(goal,{maxStages=6}={}){
 if(typeof goal!=='string'||goal.trim().length<8||goal.length>1200)throw new TypeError('invalid_goal');
 const bounded=Math.min(6,Math.max(2,Number.isInteger(maxStages)?maxStages:6));
 const stages=STAGES.slice(0,bounded).map(stage=>({...stage,description:stage.name+' for: '+goal.trim(),status:'proposed',approval:'required',execution:'not-started'}));
 const idSet=new Set(stages.map(s=>s.id));
 for(const stage of stages)stage.dependsOn=stage.dependsOn.filter(x=>idSet.has(x));
 const proposed=routeTask(goal,4).recommended;
 return {goal:goal.trim(),mode:'deterministic-work-plan',executed:false,requiresHumanApproval:true,stages,additionalSpecialists:proposed.filter(x=>!stages.some(s=>s.role===x.name)),registeredSpecialists:SPECIALISTS.length};
}
