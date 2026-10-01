"use client";
import Link from "next/link";
import { useAuth } from "@payloadcms/ui";
import { ListingTutorial, reviewQueueHref } from "./ListingTutorial";
import { AdminSearchHelp } from "./AdminSearchHelp";
import { EnsureStatusColumn } from "./EnsureStatusColumn";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import "./eventListTools.css";
import { SectionToolbar } from "./SectionToolbar";
import { EventReportPanel } from "./EventReportPanel";

export function EventListTools() {
  const { user } = useAuth();
  const params = useSearchParams();
  const reviewing = params.get('where[submittedForReview][equals]') === 'true';
  const requested = params.get("eventView");
  const view =
    requested === "archived"
      ? requested
      : "current";
  const [reports, setReports] = useState(false);
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
            onClick={() => setReports(!reports)}
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
              href={`/admin/collections/events?eventView=${key}`}
              aria-current={!reviewing && view === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
          <Link href={reviewQueueHref("events")} aria-current={reviewing ? "page" : undefined}>To be reviewed</Link>
        </nav>
      </SectionToolbar>

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
          <EventReportPanel />
        </div>
      </div>
    </div>
  );
}
