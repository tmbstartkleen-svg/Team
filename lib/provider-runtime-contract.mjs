const supported=['openai','cloudflare-workers-ai','local'];
export function describeProviderRuntime(env={}){
 const chosen=typeof env.provider==='string'?env.provider:null;
 const selected=supported.includes(chosen)?chosen:null;
 return {schema:'atlas.provider.runtime.v1',supportedProviders:supported,
  selectedProvider:selected,credentialsLoaded:false,connected:false,
  availability:'not-tested',requestsEnabled:false,
  executionMode:'disabled',modelCallCount:0,
  failClosed:true,activationRequires:'separate owner approval and provider smoke certification'};
}
