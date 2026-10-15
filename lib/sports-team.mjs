import {replicaProposal} from './governance.mjs';
export const SPORTS_DIRECTOR=Object.freeze({id:'sports-intelligence-director',workingTitle:'Sports Intelligence Director',name:null,dedicated:true,mission:'Coordinate verified, broad multi-sport schedules, scores, market data, analysis, forecasts and evidence quality',authority:'owner-final',status:'proposed-not-running',namePreference:'invite-persona-suggestion-when-runtime-connected'});
export const SPORTS_DESKS=Object.freeze([
 {id:'football',scope:'NFL, college football, FCS, global football variants'},
 {id:'basketball',scope:'NBA, WNBA, NCAA and global basketball'},
 {id:'baseball-softball',scope:'MLB, collegiate baseball and softball'},
 {id:'hockey',scope:'NHL, collegiate and international hockey'},
 {id:'soccer',scope:'International soccer leagues, cups and fixtures'},
 {id:'racket',scope:'Tennis, table tennis, badminton and other racket sports'},
 {id:'combat',scope:'MMA, UFC, boxing and combat sports'},
 {id:'other-sports',scope:'Golf, motorsport, cricket, esports and remaining covered sports'},
 {id:'player-props',scope:'Player statistics and offered prop markets across sports'},
 {id:'markets-quality',scope:'Odds provenance, coverage, freshness and independent verification'},
 {id:'simulation',scope:'Model evaluation, calibration, injury and weather context'}
]);
export function sportsTeamProposal(){
 return {director:SPORTS_DIRECTOR,desks:SPORTS_DESKS.map(d=>({...d,name:null,status:'proposed-awaiting-owner-approval',namingPrompt:'What name would you prefer for yourself? Owner approval is required before adoption.'})),teamCreationApproved:false,personasRunning:false,simulationActive:false,coverageVerified:false,requestsForNamesSent:false,replicationApproval:replicaProposal('Sports Intelligence Director','Coordinate dedicated specialist desks across supported sports')};
}
