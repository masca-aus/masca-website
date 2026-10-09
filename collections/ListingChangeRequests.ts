import type {CollectionConfig} from 'payload';
/** Only permission-checked listing endpoints expose the request history. */
export const ListingChangeRequests:CollectionConfig={
 slug:'listing-change-requests',admin:{hidden:true},lockDocuments:false,
 access:{read:()=>false,create:()=>false,update:()=>false,delete:()=>false},
 fields:[
  {name:'openKey',type:'text',required:true,unique:true},
  {name:'listingCollection',type:'text',required:true},
  {name:'listingID',type:'text',required:true},
  {name:'title',type:'text',required:true},
  {name:'message',type:'textarea',required:true},
  {name:'status',type:'select',required:true,options:['open','resolved'],defaultValue:'open'},
  {name:'resolution',type:'textarea'},
  {name:'resolvedAt',type:'date'},
  {name:'resolvedBy',type:'text'},
 ],
};
