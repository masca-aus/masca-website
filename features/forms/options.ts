export type FormOption={value:string;label:string};
export const choices=(values:readonly string[]):FormOption[]=>values.map(value=>({value,label:value}));
export const COUNTRIES=choices(['Australia','Malaysia','Australia & Malaysia','Other']);
export const INDUSTRIES=choices(['Technology','Engineering','Construction & Property','Finance & Accounting','Business & Consulting','Healthcare','Education','Legal','Marketing & Communications','Design & Creative','Hospitality & Tourism','Retail & Customer Service','Government & Non-profit','Science & Research','Manufacturing & Logistics','Other']);
export const AU_STATES:FormOption[]=[{value:'ACT',label:'Australian Capital Territory'},{value:'NSW',label:'New South Wales'},{value:'NT',label:'Northern Territory'},{value:'QLD',label:'Queensland'},{value:'SA',label:'South Australia'},{value:'TAS',label:'Tasmania'},{value:'VIC',label:'Victoria'},{value:'WA',label:'Western Australia'}];
export const MY_STATES=choices(['Johor','Kedah','Kelantan','Kuala Lumpur','Labuan','Melaka','Negeri Sembilan','Pahang','Penang','Perak','Perlis','Putrajaya','Sabah','Sarawak','Selangor','Terengganu']);
export function stateChoices(country:string):FormOption[]{return [...(country==='Australia'?AU_STATES:country==='Malaysia'?MY_STATES:[...AU_STATES,...MY_STATES]),...choices(['Multiple locations','Remote / not applicable'])];}
