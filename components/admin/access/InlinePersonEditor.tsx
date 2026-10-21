"use client";
import { useState } from "react";
import { InlineFrame } from "./InlineFrame";
import type { EditorProps } from "./inlineTypes";
export function InlinePersonEditor({
  onSave,
  onCancel,
  onReview,
  busy,
}: EditorProps) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState("");
  return (
    <InlineFrame
      title="Add person"
      label="Add person"
      onCancel={onCancel}
      onReview={onReview}
      busy={busy}
      saveLabel="Add person"
      onSubmit={async () => {
        const normal = email.trim().toLowerCase();
        if (!/^[^\s@]+@masca\.org\.au$/.test(normal))
          throw Error("Use an individual @masca.org.au email.");
        if (!name.trim()) throw Error("Enter their name.");
        await onSave({ type: "addPerson", email: normal, name: name.trim() });
      }}
    >
      <div className="ag-fields-row">
        <label>
          Name
          <input
            aria-label="Name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          MASCA email
          <input
            aria-label="MASCA email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
          />
        </label>
      </div>
      <div className="ag-summary">
        {name || "This person"} will have an approved account with no content
        access. Existing accounts are reused. No invitation email is sent.
      </div>
    </InlineFrame>
  );
}
