import type { UIFieldServerProps } from "payload";

type EditorSectionCustom = {
  description?: string;
  title?: string;
  tone?: "decision" | "standard";
};

export function EditorSection({ field }: UIFieldServerProps) {
  const custom = field.admin.custom as EditorSectionCustom | undefined;
  const title = custom?.title ?? "Details";

  return (
    <section
      className={`masca-editor-section${custom?.tone === "decision" ? " masca-editor-section--decision" : ""}`}
      aria-label={title}
    >
      <p className="masca-editor-section__eyebrow">{custom?.tone === "decision" ? "Final step" : "Section"}</p>
      <h2>{title}</h2>
      {custom?.description ? <p>{custom.description}</p> : null}
    </section>
  );
}
