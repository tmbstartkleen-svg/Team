#!/usr/bin/env node
import {buildWorkforceSimulation} from '../lib/workforce-simulation.mjs';
import {workforceCapabilityMatrix} from '../lib/workforce-capability-matrix.mjs';
const args=process.argv.slice(2);
const showMatrix=args[0]==='--capabilities';
try{
 const result=showMatrix?workforceCapabilityMatrix():buildWorkforceSimulation({title:args.join(' ')});
 console.log(JSON.stringify(result,null,2));
}catch(e){console.error(e.message);process.exitCode=2}
