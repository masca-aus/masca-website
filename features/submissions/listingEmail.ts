export type ListingCollection = 'events' | 'careers';
export type EmailContent = { to: string; subject: string; html: string; text: string; outcome?: string };
export type Listing = Record<string, unknown>;
const escape = (value: unknown) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function approvalProblem(collection: ListingCollection, doc: Listing, publicVisible: boolean) {
 if (doc._status !== 'published' || !publicVisible || (collection === 'events' && doc.reviewStatus !== 'approved')) return 'Publish an active listing before notifying the organiser.';
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(doc.contactEmail ?? ''))) return 'Add a valid submitter email before sending.';
 return null;
}
export function buildListingEmail(collection: ListingCollection, doc: Listing, kind: 'receipt' | 'approval' | 'update' | 'change-link', options: {changeURL?:string;resolution?:string} = {}): EmailContent {
 const event=collection==='events';
 const noun=event?'event':'career listing';
 const url=event?'https://www.masca.org.au/events':`https://www.masca.org.au/careers?job=${encodeURIComponent(String(doc.slug || ''))}`;
 const title=String(doc.title || 'Your listing');
 const subject=kind==='update'?`Update on your ${noun} — ${title}`:kind==='change-link'?`Your private submission link — ${title}`:kind==='receipt'?`We’ve received your ${noun} — ${title}`:`Your ${noun} is live — ${title}`;
 const heading=kind==='update'?'Your change request has been reviewed':kind==='change-link'?'Your new private submission link':kind==='receipt'?`Thanks, kawan. We’ve received your ${noun}!`:`Your ${noun} is live!`;
 const intro=kind==='update'?String(options.resolution || ''):kind==='change-link'?'Use the private link below to request an update to your submission. This link expires in 90 days.':kind==='receipt'?`Thanks for sharing ${title} with MASCA National. Your ${noun} is awaiting review and isn’t publicly visible yet.`:`${title} has been approved and published on the MASCA National website. Share your listing with your community.`;
 let date=String(event?doc.startDate || '':doc.closes || 'Rolling applications');
 if(event && date) { const parsed=new Date(date); if(!Number.isNaN(parsed.getTime()))date=new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:({QLD:'Australia/Brisbane',NSW:'Australia/Sydney',VIC:'Australia/Melbourne',ACT:'Australia/Sydney',SA:'Australia/Adelaide',WA:'Australia/Perth',TAS:'Australia/Hobart',NT:'Australia/Darwin'} as Record<string,string>)[String(doc.state)] || 'Australia/Brisbane'}).format(parsed)+` (${String(doc.state || 'Australia/Brisbane')})`; }
 const rows=[[event?'Event':'Role',title],[event?'Date & time':'Closing date',date],['Location',[event?doc.venue:doc.city,doc.state,event?'':doc.country].filter(Boolean).join(', ')],[event?'Organiser':'Organisation',String(event?doc.organisation || '':doc.company || '')]];
 const steps=[['1. We review','Our team checks your listing details.'],['2. Keep an eye out','We’ll email if we need extra details or clarification.'],['3. Share your listing','Once approved and published, we’ll email you the link to share.']];
 const help=options.changeURL?'Spotted a mistake or have new details? Tell us what needs updating. Our team will review your request before changing the listing. Keep this private link to yourself; it expires in 90 days.':`Need to update your submission? Reply with your ${event?'event name':'role title'} and the details you’d like updated. There’s no need to submit it again.`;
 const text=[`Hi ${String(doc.contactName || 'there')},`,intro,...rows.map(([label,value])=>`${label}: ${value}`),kind==='receipt'?'What’s next?\n'+steps.map(s=>s.join(': ')).join('\n'):kind==='approval'?url:'',help,options.changeURL || '','MASCA National'].join('\n\n');
 const table='role="presentation" cellpadding="0" cellspacing="0" border="0"';
 const button=(href:string,label:string)=>`<table ${table} class="email-button"><tr><td bgcolor="#ffcc00" align="center" style="background:#ffcc00;border-radius:8px;mso-padding-alt:14px 22px"><a href="${escape(href)}" style="display:inline-block;padding:14px 22px;color:#242424;font-size:15px;font-weight:bold;line-height:20px;text-decoration:none;border:1px solid #ffcc00;border-radius:8px">${label}</a></td></tr></table>`;
 const status=kind==='receipt'?'Submission received':kind==='approval'?'Listing published':kind==='update'?'Request reviewed':'Private submission link';
 const sectionHeading='margin:0 0 16px;font-size:18px;line-height:1.4;font-weight:bold;color:#242424';
 const nextSteps=kind==='receipt'?`<tr><td class="email-pad" style="padding:24px 32px;border-top:1px solid #e7e7eb"><h2 style="${sectionHeading}">What’s next?</h2><table ${table} width="100%">${steps.map(([label,value],index)=>`<tr><td width="44" valign="top" style="width:44px;padding:0 12px 16px 0"><img src="https://www.masca.org.au/email/${['review','email','share'][index]}-tile.png" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0;border-radius:6px"></td><td valign="top" style="padding:0 0 16px"><h3 style="margin:0 0 4px;font-size:15px;line-height:1.4;color:#242424">${escape(label)}</h3><p style="margin:0;font-size:14px;line-height:1.6;color:#55555f">${escape(value)}</p></td></tr>`).join('')}</table><p style="margin:0;font-size:13px;line-height:1.6;color:#55555f">Nothing else to do for now. We’ll be in touch.</p></td></tr>`:kind==='approval'?`<tr><td class="email-pad" style="padding:24px 32px;border-top:1px solid #e7e7eb"><h2 style="${sectionHeading}">Ready to share?</h2>${button(url,'View your listing →')}</td></tr>`:'';
 const html=`<!doctype html>
<html lang="en" dir="ltr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${escape(subject)}</title>
<style>body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}table{border-collapse:collapse}img{border:0;outline:none;text-decoration:none}a{overflow-wrap:anywhere}@media(max-width:480px){.email-outer{padding:12px 8px!important}.email-pad{padding-left:20px!important;padding-right:20px!important}.email-title{font-size:23px!important}.email-brand{font-size:10px!important}.email-label{width:84px!important}.email-button{width:100%!important}.email-button a{display:block!important;text-align:center!important}}</style></head>
<body style="margin:0;padding:0;background:#f2f2f2;color:#242424;font-family:Arial,Helvetica,sans-serif">
<div lang="en" dir="ltr" style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(intro)}</div>
<table ${table} lang="en" dir="ltr" width="100%" bgcolor="#f2f2f2" style="width:100%;background:#f2f2f2"><tr><td class="email-outer" align="center" style="padding:24px 12px">
<!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center"><tr><td><![endif]-->
<table ${table} class="email-shell" width="600" bgcolor="#ffffff" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e7e7eb;border-radius:12px">
<tr><td class="email-pad" style="padding:24px 32px;border-bottom:3px solid #ffcc00"><table ${table}><tr><td width="44" valign="middle" style="width:44px;padding-right:12px"><img src="https://www.masca.org.au/logo/logo.png" width="40" alt="MASCA" style="display:block;width:40px;height:auto;border:0"></td><td valign="middle"><p style="margin:0 0 4px;font-size:21px;font-weight:bold;line-height:1.1;color:#242424">MASCA</p><p class="email-brand" style="margin:0;font-size:11px;font-weight:bold;line-height:1.4;letter-spacing:.3px;color:#55555f">MALAYSIAN STUDENTS’ COUNCIL</p></td></tr></table></td></tr>
<tr><td class="email-pad" style="padding:24px 32px 20px"><span style="display:inline-block;background:#fff8d6;padding:6px 10px;border-radius:6px;font-size:12px;line-height:18px;font-weight:bold;color:#242424">✓ ${status}</span><h1 class="email-title" style="margin:16px 0 20px;font-size:26px;line-height:1.25;letter-spacing:-.4px;color:#242424">${escape(heading)}</h1><p style="margin:0 0 12px;font-size:16px;line-height:1.6;color:#242424">Hi ${escape(doc.contactName || 'there')},</p><p style="margin:0;font-size:16px;line-height:1.6;color:#242424">${escape(intro).replaceAll('\n','<br>')}</p></td></tr>
<tr><td class="email-pad" style="padding:0 32px 24px"><table ${table} width="100%" bgcolor="#f2f2f2" style="width:100%;background:#f2f2f2;color:#242424;border:1px solid #e7e7eb;border-radius:8px"><tr><td style="padding:18px 20px"><h2 style="margin:0 0 12px;font-size:16px;line-height:1.4;color:#242424">Your listing at a glance</h2><table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;table-layout:fixed">${rows.map(([label,value])=>`<tr><th class="email-label" scope="row" width="104" valign="top" style="width:104px;padding:7px 12px 7px 0;text-align:left;font-size:12px;font-weight:normal;line-height:1.6;color:#55555f">${escape(label)}</th><td valign="top" style="padding:7px 0;font-size:14px;font-weight:bold;line-height:1.6;overflow-wrap:anywhere;color:#242424">${escape(value)}</td></tr>`).join('')}</table></td></tr></table></td></tr>
${nextSteps}
<tr><td class="email-pad" style="padding:24px 32px;border-top:1px solid #e7e7eb"><h2 style="${sectionHeading}">Need to update your submission?</h2><p style="margin:0 0 18px;font-size:14px;line-height:1.65;color:#55555f">${escape(help.replace('Need to update your submission? ',''))}</p>${options.changeURL?`${button(options.changeURL,'Request a change →')}<p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#55555f">Link not working? Reply to this email for help.</p>`:''}</td></tr>
<tr><td class="email-pad" style="padding:20px 32px;border-top:1px solid #e7e7eb;font-size:12px;line-height:1.7;color:#66666f">Connecting Malaysian students across Australia.<br><strong style="color:#242424">MASCA National</strong></td></tr>
</table><!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
 return {to:String(doc.contactEmail || ''),subject,html,text};
}
export type SendRecord={id:number;createdAt:string;email:EmailContent;sentAt?:string|null;sentBy?:string|null;providerID?:string|null};
export type SendStore={get:(key:string)=>Promise<SendRecord|undefined>;create:(value:{key:string;email:EmailContent;sentBy:string})=>Promise<SendRecord>;markSent:(id:number,value:{sentAt:string;providerID:string})=>Promise<unknown>};
/** Persist the immutable request before contacting Resend. Never blindly retry outside its 24-hour deduplication window. */
export async function sendOnce(store:SendStore,deliver:(email:EmailContent,key:string)=>Promise<string>,key:string,email:EmailContent,sentBy:string){
 let record=await store.get(key);
 if(!record){try{record=await store.create({key,email,sentBy});}catch(error){record=await store.get(key);if(!record)throw error;}}
 if(record.sentAt)return record;
 if(Date.now()-new Date(record.createdAt).getTime()>23*60*60*1000)throw new Error('This attempt needs review: check Resend before sending again.');
 const providerID=await deliver(record.email,key);
 const sentAt=new Date().toISOString();
 await store.markSent(record.id,{sentAt,providerID});
 return {...record,sentAt,providerID};
}
