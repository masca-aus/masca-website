type SubmissionResponse = {ok:boolean;message:string;fieldErrors?:Record<string,string[]>};
/** Revalidate only previously reported errors; don't reveal untouched fields early. */
export function reconcileSubmissionErrors<T extends SubmissionResponse>(response:T|null,errors:Record<string,string[]>):T|null {
 if(!response||response.ok)return response;
 if(!response.fieldErrors)return null;
 const remaining=Object.fromEntries(Object.keys(response.fieldErrors).filter(key=>errors[key]?.length).map(key=>[key,errors[key]]));
 if(!Object.keys(remaining).length)return null;
 if(JSON.stringify(remaining)===JSON.stringify(response.fieldErrors))return response;
 return {...response,fieldErrors:remaining};
}
