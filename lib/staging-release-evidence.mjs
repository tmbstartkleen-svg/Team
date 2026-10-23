// Fail-closed evidence evaluator. Only explicit live workflow proof may clear the final gate.
export function evaluateStagingRelease(health, evidence = null) {
 const checks = [
  ['preview-target', health?.environment === 'preview'],
  ['not-production', health?.productionOperational === false],
  ['preview-commit', typeof health?.releaseCommit === 'string' && /^[a-f0-9]{12}$/.test(health.releaseCommit)],
  ['operator-configured', health?.configuration?.operatorSecretPresent === true],
  ['isolated-db-connected', health?.stagingDatabase?.enabled === true && health?.stagingDatabase?.connected === true],
  ['isolated-db-schema', health?.stagingDatabase?.schemaReady === true &&
   ['projects','tasks','events'].every(k => health?.stagingDatabase?.tables?.[k] === true)],
  ['model-execution-disabled', health?.capabilities?.modelExecution === 'disabled' && health?.executionConfigured === false],
  ['live-rejection-evidence', evidence?.ok === true && evidence?.environment === 'preview' &&
   evidence?.approval === 'rejected' && evidence?.duplicateDecisionStatus === 409 &&
   evidence?.modelExecution === 'not called' && evidence?.productionTouched === false &&
   typeof evidence?.taskId === 'string' &&
   Array.isArray(evidence?.auditEvents) &&
   ['task.created','task.rejected'].every(e => evidence.auditEvents.includes(e))]
 ];
 const results=checks.map(([id,pass])=>({id,pass:Boolean(pass)}));
 return {ok:results.every(x=>x.pass),classification:results.every(x=>x.pass)?'STAGING_EVIDENCE_COMPLETE':'STAGING_EVIDENCE_INCOMPLETE',
  previewHealthReady:results.slice(0,7).every(x=>x.pass),
  liveWorkflowVerified:results[7].pass,checks:results};
}
