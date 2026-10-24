// Resolve database URL without allowing a preview integration secret to affect production.
// Explicit TEAM_DATABASE_URL wins; native Neon DATABASE_URL is accepted only in Vercel Preview.
export function resolveDatabaseUrl(env={}) {
 if(typeof env.TEAM_DATABASE_URL==='string'&&env.TEAM_DATABASE_URL)return env.TEAM_DATABASE_URL;
 if(env.VERCEL_ENV==='preview'&&typeof env.DATABASE_URL==='string'&&env.DATABASE_URL)return env.DATABASE_URL;
 return null;
}
