import { withCommitteeMode } from "@/features/access/committeeEnvironment";
import { DefaultTemplate } from "@payloadcms/next/templates";
import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { mayEnterCalendar } from "@/features/mediaCalendar/policy";
import type { CalendarUser } from "@/features/mediaCalendar/types";
import { CalendarView } from "./CalendarView";
export function MediaCalendar(props: AdminViewServerProps) {
  const { initPageResult } = props;
  const rawUser = initPageResult.req.user as unknown as CalendarUser;
  const user = rawUser ? withCommitteeMode(rawUser) : rawUser;
  if (!user) redirect("/admin/login");
  if (
    process.env.MEDIA_CALENDAR_ENABLED !== "true" ||
    process.env.WORKSPACE_AUTH_ENABLED !== "true"
  )
    return (
      <main style={{ padding: 32 }}>
        <h1>Media calendar</h1>
        <p>This workspace has not enabled the private calendar yet.</p>
      </main>
    );
  if (!mayEnterCalendar(user))
    return (
      <main style={{ padding: 32 }}>
        <h1>Calendar access needed</h1>
        <p>
          A MASCA administrator can enable calendar access in People & access.
        </p>
      </main>
    );
  return (
    <DefaultTemplate
      {...props}
      req={initPageResult.req}
      visibleEntities={initPageResult.visibleEntities}
    >
      <CalendarView
        user={{
          id: user.id,
          email: user.email,
          status: user.status,
          role: user.role,
          calendarAccess: user.calendarAccess,
          accessModel: user.accessModel,
          committeeMemberships: user.committeeMemberships,
          committeeAccessReviewedAt: user.committeeAccessReviewedAt,
          committeeAccessReviewedBy: user.committeeAccessReviewedBy,
        }}
      />
    </DefaultTemplate>
  );
}
