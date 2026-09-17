import type { UIField } from "payload";

type EditorSectionOptions = {
  description: string;
  tone?: "decision" | "standard";
  title: string;
};

export const editorSection = ({
  description,
  title,
  tone = "standard",
}: EditorSectionOptions): UIField => ({
  name: `${title
    .toLowerCase()
    .replace(/\s+(\w)/g, (_, letter: string) => letter.toUpperCase())}Section`,
  type: "ui",
  admin: {
    components: {
      Field: "/components/admin/EditorSection#EditorSection",
    },
    custom: { description, title, tone },
    disableBulkEdit: true,
    disableListColumn: true,
  },
});
