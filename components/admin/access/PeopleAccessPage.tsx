import { DefaultTemplate } from "@payloadcms/next/templates";
import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { PeopleAccess } from "../PeopleAccess";
export function PeopleAccessPage(props: AdminViewServerProps) {
  const { initPageResult } = props;
  if (!initPageResult.req.user) redirect("/admin/login");
  return (
    <DefaultTemplate
      {...props}
      req={initPageResult.req}
      visibleEntities={initPageResult.visibleEntities}
    >
      <PeopleAccess />
    </DefaultTemplate>
  );
}
