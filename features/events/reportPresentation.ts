import { EVENT_TIME_ZONES } from "./eventSubmission";
export type EventReport = {
  period: string;
  total: number;
  completed: number;
  archived: number;
  organisations: [string, number][];
  states: [string, number][];
  generatedAt: string;
  rows: {
    id: number;
    title: string;
    organisation: string;
    startDate: string;
    state: string;
    lifecycle: string;
    publication?: string;
  }[];
};
export const reportMonths = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat("en-AU", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(2026, i, 1)),
  ),
);
export function reportPeriod(period: string) {
  const [year, month] = period.split("-");
  return month ? `${reportMonths[Number(month) - 1]} ${year}` : year;
}
export function reportDate(value: string, state: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone:
      EVENT_TIME_ZONES[state as keyof typeof EVENT_TIME_ZONES] ??
      "Australia/Sydney",
  }).format(new Date(value));
}
export function reportStage(value: string) {
  return (
    (
      {
        active: "Current",
        completed: "Completed",
        archived: "Archived",
      } as Record<string, string>
    )[value] ?? value
  );
}
export function reportPublication(value?: string) {
  return value === "published"
    ? "Published"
    : value === "draft"
      ? "Draft"
      : "Not specified";
}
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function reportDocument(report: EventReport) {
  const breakdown = (title: string, items: [string, number][]) =>
    `<section><h2>${title}</h2>${items.length ? items.map(([name, count]) => `<p class="pair"><span>${escape(name)}</span><strong>${count}</strong></p>`).join("") : "<p>No records</p>"}</section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>MASCA Events - ${escape(report.period)}</title><style>
@page{size:A4 landscape;margin:14mm}*{box-sizing:border-box}body{font:12px/1.5 Arial,sans-serif;color:#24252c;margin:0;background:white}header{border-top:5px solid #e54d61;padding-top:16px;border-bottom:1px solid #ddd;padding-bottom:16px}header p{margin:3px 0;color:#60636d}.brand{font-weight:700;letter-spacing:2px;color:#181365}h1{font-size:28px;margin:10px 0 4px}h2{font-size:14px;margin:0 0 8px}.stats{display:flex;gap:35px;margin:20px 0}.stats strong{display:block;font-size:24px}.stats span{color:#60636d}.breakdowns{display:flex;gap:40px;margin:20px 0}.breakdowns section{flex:1}.pair{display:flex;justify-content:space-between;border-bottom:1px solid #eee;margin:0;padding:5px 0;gap:15px}.note{color:#60636d;font-size:11px}table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:18px}th{text-align:left;background:#f4f4f6;font-size:10px;text-transform:uppercase;letter-spacing:.5px}th,td{padding:9px 8px;border-bottom:1px solid #ddd;vertical-align:top;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:20px;border-top:1px solid #ddd;padding-top:10px;color:#60636d;font-size:10px}.stats,header{break-inside:avoid}h2{break-after:avoid}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body><header><div class="brand">MASCA / EVENTS</div><h1>Event report</h1><p>${escape(reportPeriod(report.period))}</p><p>Generated ${escape(reportDate(report.generatedAt, "QLD"))} (Australia/Brisbane)</p></header>
<div class="stats">${[
    [report.total, "Events"],
    [report.completed, "Completed"],
    [report.archived, "Archived"],
    [report.organisations.length, "Organisations"],
  ]
    .map(([n, l]) => `<div><strong>${n}</strong><span>${l}</span></div>`)
    .join("")}</div>
<p class="note">Includes drafts and archived events, using latest saved details and local event start dates. Undated events are excluded. Completed and archived counts may overlap.</p>
<div class="breakdowns">${breakdown("By state", report.states)}${breakdown("By organisation", report.organisations)}</div>
${report.rows.length ? `<table><colgroup><col style="width:29%"><col style="width:23%"><col style="width:14%"><col style="width:7%"><col style="width:13%"><col style="width:14%"></colgroup><thead><tr><th>Event</th><th>Organisation</th><th>Local date</th><th>State</th><th>Event stage</th><th>Publication</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${escape(r.title)}</td><td>${escape(r.organisation)}</td><td>${escape(reportDate(r.startDate, r.state))}</td><td>${escape(r.state)}</td><td>${escape(reportStage(r.lifecycle))}</td><td>${escape(reportPublication(r.publication))}</td></tr>`).join("")}</tbody></table>` : "<p>No events in this period.</p>"}
<footer>MASCA National · Internal committee report · Latest saved data, not a historical snapshot.</footer></body></html>`;
}
export function printEventReport(report: EventReport) {
  // A dedicated document avoids printing the dashboard or clipping long reports inside the CMS layout.
  const previous = document.getElementById("masca-report-print");
  previous?.remove();
  const frame = document.createElement("iframe");
  frame.id = "masca-report-print";
  frame.title = "Event report print document";
  frame.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1120px;height:800px;border:0";
  frame.onload = () => {
    const target = frame.contentWindow;
    if (!target) return;
    target.addEventListener("afterprint", () => frame.remove(), { once: true });
    target.focus();
    target.print();
  };
  frame.srcdoc = reportDocument(report);
  document.body.appendChild(frame);
}
