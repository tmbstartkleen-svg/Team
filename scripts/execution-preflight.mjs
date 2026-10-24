#!/usr/bin/env node
import {prepareExecutionContract,assessExecutionAuthorization} from '../lib/execution-contracts.mjs';
import {describeProviderRuntime} from '../lib/provider-runtime-contract.mjs';
import {createPreparationReceipt} from '../lib/execution-audit.mjs';
const title=process.argv.slice(2).join(' ');
try {
 const contract=prepareExecutionContract({title});
 const authorization=assessExecutionAuthorization(contract,{capability:'research.read'});
 console.log(JSON.stringify({contract,authorization,receipt:createPreparationReceipt(contract,authorization),provider:describeProviderRuntime()},null,2));
}catch(e){console.error(e.message);process.exitCode=2}
