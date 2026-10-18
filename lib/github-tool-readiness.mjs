// Public configuration-only readiness: never return token, repository list, or grants.
export function githubToolReadiness(env={}){
 const token=typeof env.TEAM_GITHUB_READ_TOKEN==='string'&&env.TEAM_GITHUB_READ_TOKEN.length>=8;
 const allow=String(env.TEAM_GITHUB_READ_REPOSITORIES||'').split(',').map(x=>x.trim()).filter(Boolean);
 const repositoriesValid=allow.length>0&&allow.every(x=>/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(x));
 return {credentialsConfigured:token,allowlistConfigured:repositoriesValid,
  executionReleased:env.TEAM_TOOL_EXECUTOR_ENABLED==='true'&&env.TEAM_TOOL_EXECUTOR_RELEASED==='true',
  readyForControlledTest:token&&repositoriesValid};
}
