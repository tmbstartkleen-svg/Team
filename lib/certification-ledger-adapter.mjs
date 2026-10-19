// Adapter matches the durable runner's reserve / receipt semantics.
export function certificationLedgerAdapter(stub){
 if(!stub?.reserve||!stub?.record)throw new TypeError('certification_ledger_missing');
 return {
  reserve:args=>stub.reserve(args),
  record:args=>stub.record(args)
 };
}
