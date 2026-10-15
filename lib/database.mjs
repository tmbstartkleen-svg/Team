import pg from 'pg';
let pool;
export function database(){
 if(!process.env.TEAM_DATABASE_URL)return null;
 if(!pool)pool=new pg.Pool({connectionString:process.env.TEAM_DATABASE_URL,ssl:{rejectUnauthorized:true},max:3,connectionTimeoutMillis:3500,idleTimeoutMillis:10000});
 return pool;
}
export async function withDb(callback){
 const db=database();
 if(!db)return {ok:false,error:'database_not_configured',status:503};
 try{return await callback(db)}catch(error){console.error('team_database_failure',{code:error.code||'unknown'});return {ok:false,error:'database_unavailable',status:503}};
}
