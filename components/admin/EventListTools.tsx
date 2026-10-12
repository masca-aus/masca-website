"use client";
import { AdminLink as Link, useAdminNavigation } from "./AdminNavigationContext";
import { useAuth } from "@payloadcms/ui";
import { ListingTutorial } from "./ListingTutorial";
import { AdminSearchHelp } from "./AdminSearchHelp";
import { EnsureStatusColumn } from "./EnsureStatusColumn";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import "./eventListTools.css";
import { SectionToolbar } from "./SectionToolbar";
import dynamic from 'next/dynamic';
import { ReportSelect } from './ReportSelect';
import { eventListHref, eventListSelection } from './eventListNavigation';
import { ownershipScopes } from '@/features/access/workspacePolicy';
import { STATES } from '@/utils/states';
const EventReportPanel = dynamic(() => import('./EventReportPanel').then(module => module.EventReportPanel), { loading: () => <p role="status">Loading report tools…</p> });

export function EventListTools() {
  const { user } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const navigation = useAdminNavigation();
  const { view, status, branch } = eventListSelection(params);
  const [reports, setReports] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const navigate = (href: string) => navigation ? navigation.navigate(href, { scroll: false }) : router.push(href, { scroll: false });
  const branchOptions = [{value:'all',label:'All branches'}, ...(branch === 'custom' ? [{value:'custom',label:'Selected branches'}] : []), ...ownershipScopes.map(value => ({value,label: STATES.find(state => state.code === value)?.name ?? ({ACT:'Australian Capital Territory',NT:'Northern Territory'} as Record<string,string>)[value] ?? value}))];
  return (
    <div className="masca-event-tools masca-section-shell">
      <EnsureStatusColumn />
      <AdminSearchHelp />
      <SectionToolbar
        collection="events"
        actions={
          <div className="masca-tutorial-actions"><ListingTutorial collection="events" accountId={user?.id} /><button
            className="masca-action masca-action--secondary"
            aria-expanded={reports}
            aria-controls="masca-event-reports"
            onClick={() => { setReportsLoaded(true); setReports(!reports); }}
          >
            Reports
          </button></div>
        }
      >
        <nav aria-label="Event lists">
          {[
            ["current", "Current"],
            ["archived", "Archived"],
          ].map(([key, label]) => (
            <Link
              key={key}
              href={eventListHref(params, { view: key as 'current' | 'archived' })}
              data-tutorial={key === "archived" ? "archived" : undefined} aria-current={view === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link data-tutorial="review-queue" href={eventListHref(params, { view: 'review' })} aria-current={view === 'review' ? "page" : undefined}>To be reviewed</Link>
        </nav>
      </SectionToolbar>

      <div className="masca-event-filters" aria-label="Event filters">
        <ReportSelect label="Branch" value={branch} options={branchOptions} onChange={value => navigate(eventListHref(params, { branch: value }))} />
        {view !== 'review' && <ReportSelect label="Status" value={status} options={[{value:'all',label:'All statuses'},{value:'draft',label:'Drafts'},{value:'published',label:'Published'}]} onChange={value => navigate(eventListHref(params, { status: value as 'all' | 'draft' | 'published' }))} />}
        <Link href={eventListHref(params, { clear: true })} className="masca-action masca-action--secondary">Clear search &amp; filters</Link>
      </div>
      {view === "archived" && (
        <p>
          Archived events are kept for your records and reports. Restore an
          event as a draft to review before republishing, or
          select archived events and choose Delete to permanently remove them,
          their history and their entries in reports.
        </p>
      )}
      <div
        id="masca-event-reports"
        className={`masca-report-disclosure ${reports ? "is-open" : ""}`}
        inert={!reports}
      >
        <div className="masca-report-disclosure__inner">
          {reportsLoaded && <EventReportPanel />}
        </div>
      </div>
    </div>
  );
}
