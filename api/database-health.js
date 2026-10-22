import {authorize,respond,method} from '../lib/server-auth.mjs';
import {withDb} from '../lib/database.mjs';
import {inspectDatabaseReadiness} from '../lib/database-readiness-inspector.mjs';
export default async function handler(req,res){
 if(!method(req,res,['GET']))return;
 if(!authorize(req))return respond(res,401,{ok:false,error:'unauthorized'});
 const checked=await withDb(inspectDatabaseReadiness);
 return respond(res,checked.status||200,{...checked,status:undefined});
}
