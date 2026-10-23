// Pure, no-write evaluator for protected Preview preflight evidence.
export function evaluateReadOnlyPreflight(health, auth, expectedCommit='') {
 const h=health?.body||{};
 const safe=health?.status===200&&h.environment==='preview'&&h.productionOperational===false&&
  h.capabilities?.modelExecution==='disabled'&&h.executionConfigured===false&&
  h.stagingDatabase?.connected===true&&h.stagingDatabase?.schemaReady===true;
 if(!safe)return {ok:false,stage:'health',status:health?.status||0,error:h.error||'preview_preflight_failed',taskWrites:0};
 if(expectedCommit&&( !/^[0-9a-f]{12}$/.test(expectedCommit)||expectedCommit!==h.releaseCommit))
  return {ok:false,stage:'commit',expectedCommit,actualCommit:h.releaseCommit||null,taskWrites:0};
 const ok=auth?.status===200&&auth.body?.ok===true&&Array.isArray(auth.body.tasks);
 return {ok,stage:'operator-read',status:auth?.status||0,releaseCommit:h.releaseCommit,
  preview:true,dbReady:true,modelExecution:'disabled',taskWrites:0,
  error:ok?null:auth?.status===401?'operator_token_mismatch':auth?.body?.error||'authenticated_read_failed'};
}
