'use client';

import { useState } from 'react';
import type { OwnershipScope } from '@/features/access/workspacePolicy';
import { STATES } from '@/utils/states';
import { useDashboardView } from './DashboardTabs';
import { useAdminNavigation } from './AdminNavigationContext';
import { ReportSelect } from './ReportSelect';

function branchLabel(branch: OwnershipScope) {
  if (branch === 'National') return 'National';
  if (branch === 'NT') return 'Northern Territory (NT)';
  if (branch === 'ACT') return 'Australian Capital Territory (ACT)';
  const state = STATES.find(state => state.code === branch);
  return state ? `${state.name} (${branch})` : branch;
}

export function DashboardBranchPicker({ branches, value, view = 'workspace',committeeOnly=false,workspaceNames={} }: {workspaceNames?:Record<string,string>;committeeOnly?:boolean; view?: 'workspace' | 'metrics'; branches: OwnershipScope[]; value: 'all' | OwnershipScope }) {
  const navigation = useAdminNavigation();
  const activeView = useDashboardView() ?? view;
  const [selected, setSelected] = useState<string>(value);
  const options = [...(committeeOnly?[]:[{ value: 'all', label: 'All my branches' }]), ...branches.map(branch => ({ value: branch, label: workspaceNames[branch]??branchLabel(branch) }))];
  return <form action="/admin" method="get" className="masca-dashboard__branch" onSubmit={event => {
    if (!navigation) return;
    event.preventDefault();
    const query = new URLSearchParams({ branch: selected });
    if (activeView === 'metrics') query.set('view', 'metrics');
    navigation.navigate(`/admin?${query}`, { scroll: false });
  }}>
    <input type="hidden" name="view" value={activeView} />
    <input type="hidden" name="branch" value={selected} />
    <ReportSelect label="Branch" value={selected} options={options} onChange={setSelected} />
    <button type="submit" className="masca-action masca-action--secondary">Apply</button>
  </form>;
}
