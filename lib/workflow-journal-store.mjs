import {createJournal,appendJournalEvent,replayWorkflowJournal} from './workflow-journal.mjs';
const idPattern=/^[a-f0-9]{20}$/;
export function createWorkflowJournalStore(pool){
 if(!pool||typeof pool.connect!=='function')throw Error('invalid_database_pool');
 async function withinTransaction(callback){
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const result=await callback(client);
   await client.query('COMMIT');
   return result;
  }catch(error){
   try{await client.query('ROLLBACK')}catch{}
   throw error;
  }finally{client.release()}
 }
 return {
  async read(workflowId){
   if(!idPattern.test(workflowId))throw Error('invalid_workflow_id');
   const result=await pool.query('SELECT journal,version FROM atlas_workflow_journals WHERE workflow_id=$1',[workflowId]);
   if(!result.rows.length)return null;
   const journal=result.rows[0].journal;
   replayWorkflowJournal(journal);
   return {journal,version:Number(result.rows[0].version)};
  },
  async append(workflowId,event,{expectedVersion}={}){
   if(!idPattern.test(workflowId))throw Error('invalid_workflow_id');
   if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0)throw Error('expected_version_required');
   return withinTransaction(async client=>{
    // Serialize writers on the same workflow. Existing rows are locked; initial creation
    // is also protected by the unique primary key and conflict fallback below.
    const result=await client.query('SELECT journal,version FROM atlas_workflow_journals WHERE workflow_id=$1 FOR UPDATE',[workflowId]);
    const existing=result.rows[0];
    const version=existing?Number(existing.version):0;
    if(version!==expectedVersion)throw Error('workflow_version_conflict');
    const journal=existing?.journal??createJournal(workflowId);
    const {journal:next,replayed}=appendJournalEvent(journal,event);
    if(replayed)return {journal:next,version,replayed:true};
    if(existing){
     const updated=await client.query('UPDATE atlas_workflow_journals SET journal=$1::jsonb,version=version+1,updated_at=now() WHERE workflow_id=$2 AND version=$3 RETURNING version',
      [JSON.stringify(next),workflowId,version]);
     if(updated.rowCount!==1)throw Error('workflow_version_conflict');
    }else{
     const inserted=await client.query('INSERT INTO atlas_workflow_journals (workflow_id,version,journal) VALUES ($1,1,$2::jsonb) ON CONFLICT DO NOTHING RETURNING version',
      [workflowId,JSON.stringify(next)]);
     if(inserted.rowCount!==1)throw Error('workflow_version_conflict');
    }
    return {journal:next,version:version+1,replayed:false};
   });
  }
 };
}
