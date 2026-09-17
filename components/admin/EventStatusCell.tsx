type EventReviewStatusCellProps = {
  cellData?: unknown;
};

const statuses = {
  approved: { label: "Approved", tone: "approved" },
  pending: { label: "Pending review", tone: "pending" },
  rejected: { label: "Rejected", tone: "rejected" },
} as const;

export function EventReviewStatusCell({ cellData }: EventReviewStatusCellProps) {
  const key = typeof cellData === "string" ? cellData.toLowerCase() : "pending";
  const status = statuses[key as keyof typeof statuses] ?? statuses.pending;

  return (
    <span className={`masca-event-status-badge masca-event-status-badge--${status.tone}`}>
      {status.label}
    </span>
  );
}
