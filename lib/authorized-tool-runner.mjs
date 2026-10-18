import {authorizeToolStep} from './tool-execution-policy.mjs';
// A bounded adapter runner. The caller must provide trusted adapter implementations.
// This does not grant credentials, create durable leases, or retry side effects.
export async function executeAuthorizedToolStep({step,adapters={},approval={},timeoutMs=15000}={}){
 if(!step||typeof step!=='object'||!adapters||typeof adapters!=='object'||
    !Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>30000)
  throw new TypeError('invalid_execution_request');
 const decision=authorizeToolStep({taskApproved:approval?.taskApproved,allowedTools:approval?.allowedTools,grantedCapabilities:approval?.grantedCapabilities,confirmation:approval?.confirmation,persona:step.persona,tool:step.tool,capability:step.capability,idempotencyKey:step.idempotencyKey});
 if(!decision.allowed)return {ok:false,status:'denied',reason:decision.reason,executed:false};
 const adapter=Object.hasOwn(adapters,step.tool)?adapters[step.tool]:undefined;
 if(typeof adapter!=='function')return {ok:false,status:'blocked',reason:'adapter_unavailable',executed:false};
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  // A timeout signals cancellation; adapters must honor AbortSignal.
  const response=await adapter({signal:controller.signal,step});
  if(controller.signal.aborted)return {ok:false,status:'needs-reconciliation',reason:'timeout',executed:true};
  // A model's assertion of success is insufficient. The trusted adapter must
  // return an actual validated effect receipt.
  if(!response||response.confirmed!==true||typeof response.receiptId!=='string'||
     !/^[A-Za-z0-9_.:-]{8,128}$/.test(response.receiptId)||
     typeof response.evidence!=='string'||response.evidence.trim().length<8||
     response.evidence.length>2000)
   return {ok:false,status:'needs-verification',reason:'missing_verified_receipt',executed:true};
  return {ok:true,status:'verified',receiptId:response.receiptId,evidence:response.evidence,executed:true};
 }catch{
  return {ok:false,status:'needs-reconciliation',reason:'adapter_error',executed:true};
 }finally{clearTimeout(timeout)}
}
