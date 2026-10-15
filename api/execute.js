import {timingSafeEqual} from 'node:crypto';
function authorized(candidate,expected){
 if(!candidate||!expected)return false;
 const a=Buffer.from(candidate),b=Buffer.from(expected);
 return a.length===b.length&&timingSafeEqual(a,b);
}
function outputText(payload){
 if(typeof payload.output_text==='string')return payload.output_text;
 return (payload.output||[]).flatMap(item=>item.content||[]).filter(x=>x.type==='output_text').map(x=>x.text||'').join('\n');
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'method_not_allowed'});}
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 if(!process.env.TEAM_ADMIN_TOKEN||!process.env.OPENAI_API_KEY)return res.status(503).json({ok:false,error:'backend_not_configured'});
 if(!authorized(token,process.env.TEAM_ADMIN_TOKEN))return res.status(401).json({ok:false,error:'unauthorized'});
 const {task,persona,approved}=req.body||{};
 if(approved!==true)return res.status(403).json({ok:false,error:'explicit_approval_required'});
 if(typeof task!=='string'||task.trim().length<3||task.length>4000)return res.status(400).json({ok:false,error:'invalid_task'});
 if(typeof persona!=='string'||persona.length>100)return res.status(400).json({ok:false,error:'invalid_persona'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
 try{
  const model=process.env.TEAM_MODEL||'gpt-5-mini';
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,max_output_tokens:1000,store:false,instructions:'You are the '+persona+' specialist within ATLAS TEAM. Provide useful analysis and proposed steps only. Do not claim to have used tools, accessed files, performed actions, or executed a task. Clearly distinguish recommendations from completed actions.',input:task})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)return res.status(502).json({ok:false,error:'model_provider_error',providerStatus:response.status});
  return res.status(200).json({ok:true,execution:'completed-model-response',persona,model,result:outputText(data),requestId:data.id||null});
 }catch(error){return res.status(error.name==='AbortError'?504:502).json({ok:false,error:error.name==='AbortError'?'model_timeout':'model_unavailable'});}
 finally{clearTimeout(timer);}
}
