import type {Metadata} from 'next';
import {SubmissionChangeForm} from '@/components/SubmissionChangeForm';
export const metadata:Metadata={title:'Update your submission | MASCA National',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function ChangeSubmissionPage(){return <main style={{maxWidth:640,margin:'100px auto 64px',padding:'24px 20px'}}><SubmissionChangeForm/></main>;}
