const CATEGORIES=new Set(['formatting','workflow','priority','routine']);
export function validateMemoryItem(input,{consent=false}={}){
 if(!consent)throw new Error('memory_consent_required');
 if(!input||typeof input!=='object'||!CATEGORIES.has(input.category)||typeof input.content!=='string'||!input.content.trim()||input.content.length>500)throw new TypeError('invalid_memory_item');
 return {category:input.category,content:input.content.trim(),source:'owner-explicit'};
}
export async function setMemoryConsent(db,ownerId,enabled){
 if(!db?.prepare||typeof ownerId!=='string'||!ownerId.trim()||typeof enabled!=='boolean')throw new TypeError('invalid_consent');
 await db.prepare('INSERT INTO team_memory_consent(owner_id,enabled,updated_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(owner_id) DO UPDATE SET enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP').bind(ownerId,Number(enabled)).run();
 return {enabled,ownerId};
}
export async function eraseOwnerMemory(db,ownerId){
 if(!db?.prepare||typeof ownerId!=='string'||!ownerId.trim())throw new TypeError('invalid_owner');
 await db.prepare('DELETE FROM team_memory_items WHERE owner_id=?').bind(ownerId).run();
 await setMemoryConsent(db,ownerId,false);
 return {erased:true,consentEnabled:false};
}
export async function listOwnerMemory(db,ownerId){
 if(!db?.prepare||typeof ownerId!=='string'||!ownerId.trim())throw new TypeError('invalid_owner');
 const res=await db.prepare('SELECT id,category,content,source,created_at FROM team_memory_items WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').bind(ownerId).all();
 return res.results||[];
}
