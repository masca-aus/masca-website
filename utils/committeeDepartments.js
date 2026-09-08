// Kept as plain ESM so Payload's config loader can consume the same constants
// during type generation, migrations, Next builds, and the Vitest runtime.
export const COMMITTEE_DEPARTMENTS = [
  { label: "Chairs", value: "chairs", accent: "blue" },
  { label: "Secretariat", value: "secretariat", accent: "slate" },
  { label: "Treasury", value: "treasury", accent: "sky" },
  { label: "Amplifies", value: "amplifies", accent: "green" },
  { label: "Careers", value: "careers", accent: "yellow" },
  { label: "Cares", value: "cares", accent: "orange" },
  { label: "Unites", value: "unites", accent: "red" },
];

export const UNASSIGNED_DEPARTMENT = {
  label: "Unassigned — needs review",
  value: "unassigned",
  accent: "gray",
};

export const COMMITTEE_DEPARTMENT_OPTIONS = [
  ...COMMITTEE_DEPARTMENTS.map(({ label, value }) => ({ label, value })),
  {
    label: UNASSIGNED_DEPARTMENT.label,
    value: UNASSIGNED_DEPARTMENT.value,
  },
];

export const COMMITTEE_DEPARTMENT_GROUPS = [
  ...COMMITTEE_DEPARTMENTS,
  UNASSIGNED_DEPARTMENT,
];
