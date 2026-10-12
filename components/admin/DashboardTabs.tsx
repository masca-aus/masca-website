'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

type DashboardView = 'workspace' | 'metrics';
const DashboardViewContext = createContext<DashboardView | undefined>(undefined);
export function useDashboardView() { return useContext(DashboardViewContext); }
const views = ['workspace', 'metrics'] as const;

/** Keep both server-rendered panels mounted while changing only the visible view. */
export function DashboardTabs({ initialView, branch, children, workspace, metrics }: {
  initialView: DashboardView; branch: string; children: ReactNode; workspace: ReactNode; metrics: ReactNode;
}) {
  const [view, setView] = useState(initialView);
  const id = useId();
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    const restore = () => setView(new URLSearchParams(window.location.search).get('view') === 'metrics' ? 'metrics' : 'workspace');
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  function select(next: DashboardView) {
    if (next === view) return;
    const url = new URL(window.location.href);
    url.searchParams.set('branch', branch);
    if (next === 'metrics') url.searchParams.set('view', next);
    else url.searchParams.delete('view');
    window.history.pushState(null, '', `${url.pathname}${url.search}${url.hash}`);
    setView(next);
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1
      : event.key === 'ArrowRight' || event.key === 'ArrowLeft' ? 1 - index : null;
    if (next === null) return;
    event.preventDefault();
    tabs.current[next]?.focus();
    select(views[next]);
  }
  return <DashboardViewContext.Provider value={view}>
    <main className="masca-dashboard">
      {children}
      <div className="masca-dashboard__tabs" role="tablist" aria-label="Dashboard views">
        {views.map((item, index) => <button key={item} ref={node => { tabs.current[index] = node; }} type="button"
          role="tab" id={`${id}-${item}-tab`} aria-controls={`${id}-${item}-panel`} aria-selected={view === item}
          tabIndex={view === item ? 0 : -1} onClick={() => select(item)} onKeyDown={event => navigate(event, index)}>
          {item === 'workspace' ? 'Workspace' : 'Metrics'}
        </button>)}
      </div>
      {views.map(item => <div key={item} id={`${id}-${item}-panel`} role="tabpanel" aria-labelledby={`${id}-${item}-tab`}
        className={`masca-dashboard__panel masca-dashboard__${item}`} hidden={view !== item} tabIndex={0}>
        {item === 'workspace' ? workspace : metrics}
      </div>)}
    </main>
  </DashboardViewContext.Provider>;
}
