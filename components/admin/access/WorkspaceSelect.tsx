"use client";
import { CalendarSelect } from "../mediaCalendar/CalendarSelect";
export function WorkspaceSelect({
  value,
  options,
  onChange,
  disabled,
  label = "Workspace",
}: {
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <CalendarSelect
      label={label}
      value={value}
      options={options.map((o) => ({ value: o.id, label: o.name }))}
      onChange={onChange}
      disabled={disabled}
    />
  );
}
