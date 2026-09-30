"use client";
import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  LoaderCircle,
  Printer,
} from "lucide-react";
import {
  type EventReport,
  printEventReport,
  reportDate,
  reportMonths,
  reportPeriod,
  reportPublication,
  reportStage,
} from "@/features/events/reportPresentation";
import "./eventListTools.css";
import { ReportSelect } from "./ReportSelect";
export function EventReportPanel() {
  const today = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: "Australia/Brisbane",
  }).formatToParts(new Date());
  const [frequency, setFrequency] = useState("month"),
    [year, setYear] = useState(today.find((x) => x.type === "year")!.value),
    [month, setMonth] = useState(today.find((x) => x.type === "month")!.value);
  const [report, setReport] = useState<EventReport | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const period = frequency === "month" ? `${year}-${month}` : year;
  function change(update: () => void) {
    update();
    setReport(null);
    setError("");
  }
  async function generate(event: React.FormEvent) {
    event.preventDefault();
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch(
        `/api/events/report?period=${encodeURIComponent(period)}`,
        { credentials: "same-origin", signal: request.signal },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || "Report unavailable. Please try again.",
        );
      setReport(data);
    } catch (cause) {
      if (!request.signal.aborted) setError((cause as Error).message);
    } finally {
      if (!request.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="masca-event-report" aria-label="Event reports">
      <div className="masca-event-report__intro">
        <span className="masca-event-report__icon">
          <FileText size={22} />
        </span>
        <div>
          <h2>Event reports</h2>
          <p>
            Choose a period, review the summary, then export a report for your
            team.
          </p>
        </div>
      </div>
      <form onSubmit={generate} aria-busy={busy}>
        <ReportSelect
          label="Report period"
          value={frequency}
          disabled={busy}
          options={[
            { value: "month", label: "Monthly" },
            { value: "year", label: "Yearly" },
          ]}
          onChange={(value) => change(() => setFrequency(value))}
        />
        {frequency === "month" && (
          <ReportSelect
            label="Month"
            value={month}
            disabled={busy}
            options={reportMonths.map((label, i) => ({
              label,
              value: String(i + 1).padStart(2, "0"),
            }))}
            onChange={(value) => change(() => setMonth(value))}
          />
        )}
        <ReportSelect
          label="Year"
          value={year}
          disabled={busy}
          options={Array.from({ length: 301 }, (_, i) => ({
            label: String(2200 - i),
            value: String(2200 - i),
          }))}
          onChange={(value) => change(() => setYear(value))}
        />
        <button
          type="submit"
          className="masca-action masca-action--primary"
          disabled={busy}
        >
          {busy ? (
            <LoaderCircle
              size={17}
              className="masca-report-spin"
              aria-hidden="true"
            />
          ) : (
            <CalendarDays size={17} aria-hidden="true" />
          )}
          {busy ? "Generating…" : "Generate report"}
        </button>
      </form>
      <p className="masca-event-report__hint">
        Includes drafts and archived events, based on their local start date.
        Undated events are excluded.
      </p>
      <div role="status" className="masca-event-report__status">
        {busy
          ? "Preparing your report…"
          : report
            ? `Report ready: ${report.total} events for ${reportPeriod(report.period)}.`
            : ""}
      </div>
      {error && (
        <p role="alert" className="masca-event-report__error">
          {error}
        </p>
      )}
      {report && (
        <div className="masca-event-report__output">
          <div className="masca-event-report__heading">
            <div>
              <span className="masca-event-report__eyebrow">
                REPORT PREVIEW
              </span>
              <h3>{reportPeriod(report.period)}</h3>
              <p>Generated {reportDate(report.generatedAt, "QLD")}</p>
            </div>
            <div className="masca-event-report__actions">
              <a
                className="masca-action masca-action--secondary"
                href={`/api/events/report?period=${report.period}&format=csv`}
              >
                <Download size={16} aria-hidden="true" />
                Download CSV
              </a>
              <button
                type="button"
                className="masca-action masca-action--primary"
                onClick={() => printEventReport(report)}
              >
                <Printer size={16} aria-hidden="true" />
                Print / save PDF
              </button>
            </div>
          </div>
          <p className="masca-event-report__hint">
            Choose “Save as PDF” in the print dialog. Use landscape and turn off
            browser headers and footers for a clean report.
          </p>
          <div className="masca-event-report__stats">
            {[
              [report.total, "Events"],
              [report.completed, "Completed"],
              [report.archived, "Archived"],
              [report.organisations.length, "Organisations"],
            ].map(([count, label]) => (
              <div key={label}>
                <strong>{count}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="masca-event-report__hint">
            Completed and archived counts may overlap. This report uses latest
            saved details, not a historical snapshot.
          </p>
          {report.total > 0 ? (
            <>
              <div className="masca-event-report__breakdown">
                {[
                  ["By state", report.states],
                  ["By organisation", report.organisations],
                ].map(([title, items]) => (
                  <section key={title as string}>
                    <h4>{title as string}</h4>
                    {(items as [string, number][]).map(([name, count]) => (
                      <p key={name}>
                        <span>{name}</span>
                        <strong>{count}</strong>
                      </p>
                    ))}
                  </section>
                ))}
              </div>
              <div
                className="masca-event-report__table"
                tabIndex={0}
                role="region"
                aria-label="Event report details"
              >
                <table>
                  <thead>
                    <tr>
                      {[
                        "Event",
                        "Organisation",
                        "Local date",
                        "State",
                        "Event stage",
                        "Publication",
                      ].map((x) => (
                        <th scope="col" key={x}>
                          {x}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.title}</td>
                        <td>{row.organisation}</td>
                        <td>{reportDate(row.startDate, row.state)}</td>
                        <td>{row.state}</td>
                        <td>{reportStage(row.lifecycle)}</td>
                        <td>{reportPublication(row.publication)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="masca-event-report__empty">
              <CalendarDays size={26} aria-hidden="true" />
              <h4>No events in this period</h4>
              <p>
                Choose another month or year to generate a different report.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
