export default function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'method_not_allowed'});}
 res.setHeader('Cache-Control','no-store');
 const configured=Boolean(process.env.TEAM_ADMIN_TOKEN&&process.env.OPENAI_API_KEY);
 return res.status(200).json({ok:true,service:'atlas-team',version:'0.3.0',executionConfigured:configured,modelConfigured:Boolean(process.env.OPENAI_API_KEY),accessConfigured:Boolean(process.env.TEAM_ADMIN_TOKEN),mode:'approval-gated-server'});
}
