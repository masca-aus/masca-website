import type { CollectionConfig } from 'payload';
/** Internal outbox: content and audit data are only exposed through permission-checked listing endpoints. */
export const ListingEmails: CollectionConfig = {
 slug:'listing-emails',admin:{hidden:true},lockDocuments:false,
 access:{read:()=>false,create:()=>false,update:()=>false,delete:()=>false},
 fields:[
  {name:'key',type:'text',required:true,unique:true},
  {name:'listingCollection',type:'text',required:true},
  {name:'listingID',type:'text',required:true},
  {name:'kind',type:'text',required:true},
  {name:'email',type:'json',required:true},
  {name:'sentBy',type:'text',required:true},
  {name:'sentAt',type:'date'},
  {name:'providerID',type:'text'},
 ],
};
