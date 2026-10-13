import type {CommitteeAccount} from '../committeePolicy.ts';
import type {PolicyWorkspace} from './types.ts';
export function withWorkspaceAuthority<T extends CommitteeAccount>(account:T,catalog:PolicyWorkspace[]):T & {accessCatalog:PolicyWorkspace[]}{return {...account,accessCatalog:catalog.map(w=>({id:w.id,status:w.status,areas:[...w.areas]}))}}
