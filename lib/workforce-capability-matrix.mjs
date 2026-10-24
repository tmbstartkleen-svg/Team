import {SPECIALISTS} from './route.mjs';
const readOnly=new Set(['Program Manager','Data Analyst','Documentation Lead','Chief Architect','QA Engineer','Security Reviewer','Financial Analyst','Research Director','Compliance Auditor']);
export function workforceCapabilityMatrix(){
 return {schema:'atlas.workforce.capabilities.v1',personas:SPECIALISTS.map(p=>({
  id:p.id,name:p.name,role:'planning-profile',
  canPlan:true,canExecute:false,requiresHumanApproval:true,
  permittedModes:readOnly.has(p.name)?['offline-plan','read-only-review']:['offline-plan'],
  activeModel:null,networkToolsEnabled:false
 })),onlineAgentCount:0,autonomousExecution:false,modelProviderConnected:false};
}
