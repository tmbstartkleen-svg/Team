import {createHash} from 'node:crypto';
import {buildWorkforceSimulation} from './workforce-simulation.mjs';
const capabilities=new Set(['research.read','files.read','code.inspect','report.draft']);
const denied=/^(?:external\.write|task\.execute|production\.|credential\.|payment\.|message\.send)/;
export function prepareExecutionContract(input){
 const workflow=buildWorkforceSimulation(input);
 const requested=input?.capabilities??['research.read'];
 if(!Array.isArray(requested)||requested.length>16||requested.some(c=>typeof c!=='string'))throw Error('invalid_capabilities');
 const normalized=[...new Set(requested)];
 if(normalized.some(c=>denied.test(c)||!capabilities.has(c)))throw Error('capability_not_authorized');
 const contract={schema:'atlas.execution.contract.v1',workflowId:workflow.id,
   title:workflow.title,lead:workflow.lead,mode:'disabled-preparation',
   allowedCapabilities:normalized,toolCalls:[],provider:null,providerRequests:0,
   networkCalls:0,databaseWrites:0,approvalState:'not-approved',
   executable:false,productionTouched:false,workflowNodes:workflow.nodes.map(n=>({id:n.id,dependsOn:n.dependsOn}))};
 return {...contract,digest:createHash('sha256').update(JSON.stringify(contract)).digest('hex')};
}
export function assessExecutionAuthorization(contract,request={}){
 if(contract?.schema!=='atlas.execution.contract.v1'||typeof contract.digest!=='string')throw Error('invalid_contract');
 const requested=request.capability;
 if(typeof requested!=='string')throw Error('invalid_capability');
 const permitted=contract.allowedCapabilities.includes(requested)&&capabilities.has(requested);
 return {schema:'atlas.execution.authorization.v1',capability:requested,
   permittedForPlanning:permitted,executionAuthorized:false,
   reason:permitted?'runtime_disabled_requires_explicit_owner_approval':'capability_not_allowed',
   actionTaken:false,providerCalled:false,databaseWritten:false};
}
