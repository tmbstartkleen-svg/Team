export const TEAM_GOVERNANCE=Object.freeze({
 authority:'owner-final',
 owner:'human-project-owner',
 policyVersion:'1.0',
 replicasAllowed:true,
 replicationMode:'proposed-only',
 decisionRule:'All final decisions and external side effects require explicit owner approval',
 privileges:['research','analyze','draft','recommend','propose-delegation','propose-replica'],
 prohibitedWithoutApproval:['send-email','post-message','change-calendar','modify-file','deploy','spend','share-data','grant-access','create-replica','execute-tool']
});
export function replicaProposal(role,purpose){
 if(typeof role!=='string'||!role.trim()||role.length>100||typeof purpose!=='string'||purpose.trim().length<8||purpose.length>500)throw new TypeError('invalid_replica_request');
 return {role:role.trim(),purpose:purpose.trim(),status:'awaiting-owner-approval',inheritsGovernance:true,autonomous:false,canApproveOwnActions:false};
}
export function ownerApprovalRequired(action){return TEAM_GOVERNANCE.prohibitedWithoutApproval.includes(action)||!TEAM_GOVERNANCE.privileges.includes(action)}
