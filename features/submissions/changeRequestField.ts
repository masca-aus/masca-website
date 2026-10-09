import type {Field} from 'payload';
import type {ListingCollection} from './listingEmail.ts';
export function changeRequestField(collection:ListingCollection):Field{return {
 name:'changeRequestStatus',type:'text',virtual:true,label:'Submitter updates',
 access:{read:({req})=>Boolean(req.user),create:()=>false,update:()=>false},
 admin:{components:{Field:false},disableBulkEdit:true},
 hooks:{afterRead:[async({data,req})=>{
  if(!req.user||!data?.id)return undefined;
  const result=await req.payload.find({collection:'listing-change-requests',where:{openKey:{equals:`${collection}:${data.id}`}},limit:1,depth:0,overrideAccess:true});
  return result.docs.length?'Change requested':'—';
 }]},
};}
