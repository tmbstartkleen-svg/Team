// One object per certification task: durable, atomic idempotency and receipt state.
const DurableObjectBase = (await import('cloudflare:workers').then(m=>m.DurableObject).catch(()=>class {constructor(ctx,env){this.ctx=ctx;this.env=env;}}));
export class CertificationLedger extends DurableObjectBase {
 constructor(ctx,env){super(ctx,env);this.ctx=ctx;this.env=env;}
 async inspect({idempotencyKey}){
  if(typeof idempotencyKey!=='string'||!/^[A-Za-z0-9_.:-]{8,128}$/.test(idempotencyKey))throw new TypeError('invalid_inspection_key');
  const row=await this.ctx.storage.get('action:'+idempotencyKey);
  if(!row)return {found:false,state:'missing',receiptPresent:false};
  return {found:true,state:['reserved','confirmed','needs-reconciliation'].includes(row.state)?row.state:'invalid',receiptPresent:typeof row.receiptId==='string'&&row.receiptId.length>0};
 }
 async reserve({taskId,stepId,idempotencyKey}){
  if(![taskId,stepId,idempotencyKey].every(s=>typeof s==='string'&&/^[A-Za-z0-9_.:-]{8,128}$/.test(s)))throw new TypeError('invalid_action_reservation');
  return this.ctx.storage.transaction(async tx=>{
   const key='action:'+idempotencyKey;
   const old=await tx.get(key);
   if(old)return {reserved:false,status:old.taskId!==taskId||old.stepId!==stepId?'collision':old.state};
   await tx.put(key,{taskId,stepId,state:'reserved'});
   return {reserved:true,status:'reserved'};
  });
 }
 async record({taskId,stepId,idempotencyKey,receiptId,evidence,confirmed=false}){
  if(![taskId,stepId,idempotencyKey].every(s=>typeof s==='string'&&/^[A-Za-z0-9_.:-]{8,128}$/.test(s)))throw new TypeError('invalid_action_outcome');
  if(confirmed&&(!/^[A-Za-z0-9_.:-]{8,128}$/.test(receiptId||'')||typeof evidence!=='string'||evidence.trim().length<8||evidence.length>2000))throw new TypeError('invalid_action_receipt');
  return this.ctx.storage.transaction(async tx=>{
   const key='action:'+idempotencyKey,old=await tx.get(key);
   if(!old||old.state!=='reserved'||old.taskId!==taskId||old.stepId!==stepId)return {recorded:false,status:'not-updated'};
   // Receipt ids are unique within this task's object; refuse collisions.
   if(confirmed){
    const receiptKey='receipt:'+receiptId;
    if(await tx.get(receiptKey))return {recorded:false,status:'not-updated'};
    await tx.put(receiptKey,idempotencyKey);
   }
   const state=confirmed?'confirmed':'needs-reconciliation';
   await tx.put(key,{...old,state,receiptId:confirmed?receiptId:null,evidence:confirmed?evidence:null});
   return {recorded:true,status:state};
  });
 }
}
