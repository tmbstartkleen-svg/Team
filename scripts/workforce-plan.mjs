#!/usr/bin/env node
import {planWorkforceTask} from '../lib/workforce-plan.mjs';
const title=process.argv.slice(2).join(' ');
try {console.log(JSON.stringify(planWorkforceTask({title}),null,2))}
catch(e){console.error(e.message);process.exitCode=2}
