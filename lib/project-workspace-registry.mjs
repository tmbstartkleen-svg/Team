// Unified ATLAS workspace registry. No repository transfer, secret sharing or deployment.
// Each existing project remains independently owned, versioned and permission-gated.
export const PROJECT_WORKSPACES=Object.freeze([
 {id:'team',name:'ATLAS Team',kind:'core',repo:'tmbstartkleen-svg/Team',leader:'coding-execution'},
 {id:'safeguard',name:'Safeguard',kind:'security',repo:'tmbstartkleen-svg/Safeguard',leader:'cybersecurity-lead'},
 {id:'edgeforce',name:'EdgeForce Sports Intelligence',kind:'sports',repo:'tmbstartkleen-svg/Edgeforce-AI',leader:'sports-guru'},
 {id:'claude-sports',name:'Claude Sports',kind:'sports',repo:'tmbstartkleen-svg/Claude_Sports',leader:'sports-guru'},
 {id:'claude-sports-tmb',name:'Claude Sports TMB',kind:'sports',repo:'tmbstartkleen-svg/Claude_Sports_TMB',leader:'sports-guru'},
 {id:'grok-sports',name:'Grok Sports',kind:'sports',repo:'tmbstartkleen-svg/Grok_Sports',leader:'sports-guru'},
 {id:'gemini-sports',name:'Gemini Sports',kind:'sports',repo:'tmbstartkleen-svg/Gemini-Sports',leader:'sports-guru'},
 {id:'counter',name:'Counter',kind:'sports-adjacent',repo:'tmbstartkleen-svg/Counter',leader:'coding-execution'},
 {id:'fee-fi',name:'Fee-Fi',kind:'business',repo:'tmbstartkleen-svg/fee-fi-beta',leader:'mba'},
 {id:'shiftproof',name:'Shiftproof',kind:'business',repo:'tmbstartkleen-svg/Shiftproof',leader:'sanitation-regional'},
 {id:'travai',name:'TravAI',kind:'business',repo:'tmbstartkleen-svg/TravAI',leader:'coding-execution'},
 {id:'santera',name:'Santera',kind:'business-review',repo:'tmbstartkleen-svg/santera',leader:'mba'},
 {id:'santera-fixed',name:'Santera Free Fixed',kind:'business-review',repo:'tmbstartkleen-svg/santera-free-fixed',leader:'mba'},
 {id:'santera-7',name:'Santera 7',kind:'business-review',repo:'tmbstartkleen-svg/Santera-7',leader:'mba'},
 {id:'santera-v3',name:'Santera v3',kind:'business-review',repo:'tmbstartkleen-svg/Santera-v-3',leader:'mba'}
]);
const VALID=/^[a-z][a-z0-9-]{1,70}$/;
export function listProjectWorkspaces(kind=null){
 return PROJECT_WORKSPACES.filter(p=>kind===null||p.kind===kind).map(p=>({...p,connection:'not_independently_verified',canExecute:false,canDelete:false}));
}
export function buildWorkspaceAssignment({projectId,specialistId,taskTitle}={}){
 if(!VALID.test(projectId||'')||!VALID.test(specialistId||'')||typeof taskTitle!=='string'||taskTitle.trim().length<5||taskTitle.length>500)
  return {ok:false,reason:'invalid_assignment'};
 const project=PROJECT_WORKSPACES.find(p=>p.id===projectId);
 if(!project)return {ok:false,reason:'unknown_project'};
 if(project.leader!==specialistId)return {ok:false,reason:'specialist_not_workspace_lead'};
 return {ok:true,state:'proposal',projectId,specialistId,taskTitle:taskTitle.trim(),
  executionStarted:false,ownerApprovalRequired:true,sourceRepositoryUnchanged:true};
}
