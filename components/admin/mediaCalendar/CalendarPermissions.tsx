"use client";
import { useField } from "@payloadcms/ui";
import type { CalendarAccess } from "@/features/mediaCalendar/types";
export function CalendarPermissions({ path }: { path: string }) {
  const { value, setValue } = useField<CalendarAccess | null>({ path });
  const v = value ?? {
    view: false,
    edit: false,
    approve: false,
    designation: null,
  };
  const update = (patch: Partial<CalendarAccess>) =>
    setValue({ ...v, ...patch });
  return (
    <fieldset
      style={{
        padding: 20,
        border: "1px solid var(--theme-elevation-150)",
        borderRadius: 12,
      }}
    >
      <legend>National media calendar</legend>
      <p>
        Private post planning and review. These permissions do not change public
        website access.
      </p>
      <label>
        <input
          type="checkbox"
          checked={v.view}
          onChange={(e) =>
            update({
              view: e.target.checked,
              ...(!e.target.checked ? { edit: false, approve: false } : {}),
            })
          }
        />{" "}
        View calendar
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          checked={v.edit}
          onChange={(e) =>
            update({
              edit: e.target.checked,
              ...(e.target.checked ? { view: true } : {}),
            })
          }
        />{" "}
        Prepare posts and manage categories
      </label>
      <br />
      <label>
        Team role{" "}
        <select
          value={v.designation ?? ""}
          onChange={(e) =>
            update({
              designation: (e.target.value ||
                null) as CalendarAccess["designation"],
              ...(!e.target.value ? { approve: false } : {}),
            })
          }
        >
          <option value="">No team designation</option>
          <option value="member">Media team member</option>
          <option value="chair">Chair</option>
        </select>
      </label>
      <br />
      <label>
        <input
          type="checkbox"
          disabled={!v.designation}
          checked={v.approve}
          onChange={(e) =>
            update({
              approve: e.target.checked,
              ...(e.target.checked ? { view: true } : {}),
            })
          }
        />{" "}
        Approve another person’s content
      </label>
    </fieldset>
  );
}
