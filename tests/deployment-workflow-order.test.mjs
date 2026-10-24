import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const workflow=readFileSync(new URL('../.github/workflows/deploy-cloudflare.yml',import.meta.url),'utf8');
function step(name){const marker='      - name: '+name+'\n';const at=workflow.indexOf(marker);assert.notEqual(at,-1,'missing workflow step '+name);return at;}
test('final deployment inventory is checked after Worker deploy and every secret update',()=>{
 const deploy=step('Deploy Cloudflare Worker');
 const owner=step('Configure owner-only API token when explicitly provided');
 const executor=step('Install executor credentials without enabling execution');
 const final=step('Verify final Cloudflare deployment after secret updates');
 assert.ok(deploy<owner&&owner<executor&&executor<final);
});
test('final deployment check requires authenticated provider data and fails closed',()=>{
 const start=step('Verify final Cloudflare deployment after secret updates');
 const end=step('Report Cloudflare publication');
 const block=workflow.slice(start,end);
 for(const required of ['CF_API_TOKEN','CF_ACCOUNT_ID','/workers/scripts/atlas-team/deployments','response.success!==true','final_deployment_order_untrusted','latest.versions.length!==1','percentage!==100','final_deployment_ambiguous','commit and bundle provenance NOT certified']){
  assert.ok(block.includes(required),'missing fail-closed check: '+required);
 }
});
