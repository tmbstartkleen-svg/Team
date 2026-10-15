// Deprecated legacy path. Model execution is only available through
// /api/execute-approved using a persisted, server-approved task.
export default function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({ok:false,error:'method_not_allowed'});}
 return res.status(410).json({ok:false,error:'legacy_execution_retired',replacement:'/api/execute-approved'});
}
