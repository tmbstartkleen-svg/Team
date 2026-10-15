import {timingSafeEqual} from 'node:crypto';
export function authorize(req) {
 const expected=process.env.TEAM_ADMIN_TOKEN;
 const value=String(req.headers?.authorization||'');
 const token=value.replace(/^Bearer\s+/i,'');
 if(!expected||!token)return false;
 const a=Buffer.from(expected),b=Buffer.from(token);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function respond(res,code,data){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(code).json(data);}
export function method(req,res,allowed){if(allowed.includes(req.method))return true;res.setHeader('Allow',allowed.join(', '));respond(res,405,{ok:false,error:'method_not_allowed'});return false;}
