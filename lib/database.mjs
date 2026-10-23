import pg from 'pg';
import {resolveDatabaseUrl} from './database-url.mjs';
let pool;
export function database(){
 const url=resolveDatabaseUrl(process.env);
 if(!url)return null;
 if(!pool)pool=new pg.Pool({connectionString:url,ssl:{rejectUnauthorized:true},max:3,connectionTimeoutMillis:3500,idleTimeoutMillis:10000});
 return pool;
}
export async function withDb(callback){
 const db=database();
 if(!db)return {ok:false,error:'database_not_configured',status:503};
 try{return await callback(db)}catch(error){console.error('team_database_failure',{code:error.code||'unknown'});return {ok:false,error:'database_unavailable',status:503}};
}
