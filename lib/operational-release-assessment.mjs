// Read-only classification: runtime health is not evidence of a live staging test.
// Never infer production approval, agent autonomy, or certification from configuration alone.
export function assessAtlasReadiness(health={}) {
 const blockers=[];
 if(health.environment!=='preview')blockers.push('preview_environment_required');
 if(health.productionOperational!==false)blockers.push('production_isolation_unverified');
 if(!/^[0-9a-f]{12}$/.test(health.releaseCommit||''))blockers.push('release_commit_unverified');
 if(health.stagingDatabase?.connected!==true||health.stagingDatabase?.schemaReady!==true)blockers.push('staging_database_unready');
 if(health.capabilities?.modelExecution!=='disabled'||health.executionConfigured!==false)blockers.push('model_execution_must_be_disabled');
 if(health.releaseChecks?.liveWorkflowVerified!==true)blockers.push('live_workflow_evidence_not_attached');
 if(health.edge?.certified!==true)blockers.push('edge_integration_not_certified');
 if(health.capabilities?.autonomousAgents!==true)blockers.push('autonomous_agents_not_operational');
 if(health.releaseChecks?.minimumConfigurationPresent!==true)blockers.push('minimum_operational_configuration_missing');
 return {kind:'READ_ONLY_ATLAS_RELEASE_ASSESSMENT',releaseCommit:health.releaseCommit||null,
  previewHealthReady:blockers.slice(0,5).length===0,
  productionLaunchReady:false,productionApprovalGranted:false,blockers};
}
