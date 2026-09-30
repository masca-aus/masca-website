"use client";

import { useEffect, useId, useRef, useState } from "react";
import "./publicOrganisationSearch.css";

type OrganisationOption = {
  id: number | string;
  name: string;
  abbreviation?: string | null;
  university?: string | null;
  state?: string | null;
};

type Props = { id: string; name: string; label: string; required?: boolean; error?: string };

export function PublicOrganisationSearch({ id, name, label, required, error }: Props) {
  const [value, setValue] = useState("");
  const [options, setOptions] = useState<OrganisationOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(-1);
  const uid = useId();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = input.current?.form;
    if (!form) return;
    const reset = () => { setValue(""); setOptions([]); setOpen(false); setActive(-1); setFailed(false); };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, []);

  useEffect(() => {
    const queryText = value.trim();
    if (!open || queryText.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(`/api/public-organisations?q=${encodeURIComponent(queryText)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Organisation directory unavailable");
        const result: unknown = await response.json();
        if (!Array.isArray(result)) throw new Error("Invalid organisation directory response");
        if (!controller.signal.aborted) setOptions(result as OrganisationOption[]);
      } catch {
        if (!controller.signal.aborted) { setOptions([]); setFailed(true); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value, open]);

  const choose = (option: OrganisationOption) => {
    setValue(option.name);
    setOpen(false);
    setActive(-1);
    input.current?.focus();
  };

  return <div className="public-organisation">
    <label className="mb-2 block text-body-sm font-bold text-gray-700" htmlFor={id}>{label}{required && <> <span aria-hidden="true">*</span></>}</label>
    <input ref={input} id={id} name={name} type="text" role="combobox" value={value} required={required}
      minLength={required ? 2 : undefined} maxLength={160} autoComplete="off"
      placeholder="Search by association, abbreviation or university"
      aria-autocomplete="list" aria-expanded={open} aria-controls={`${uid}-options`}
      aria-activedescendant={open && active >= 0 && options[active] ? `${uid}-option-${active}` : undefined}
      aria-invalid={error ? true : undefined} aria-describedby={`${uid}-hint${error ? ` ${uid}-error` : ""}`}
      onFocus={() => setOpen(true)}
      onChange={event => { setValue(event.target.value); setOptions([]); setLoading(false); setFailed(false); setOpen(true); setActive(-1); }}
      onBlur={event => { if (!event.currentTarget.parentElement?.contains(event.relatedTarget as Node | null)) setOpen(false); }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActive(-1); }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); setOpen(true);
          setActive(previous => options.length ? (event.key === "ArrowDown" ? (previous + 1) % options.length : previous <= 0 ? options.length - 1 : previous - 1) : -1);
        }
        if (event.key === "Enter" && open && options[active]) { event.preventDefault(); choose(options[active]); }
      }} />
    {open && <div className="public-organisation__results">
      {options.length > 0 && <ul id={`${uid}-options`} role="listbox" aria-label="Student associations">
        {options.map((option, index) => <li id={`${uid}-option-${index}`} key={option.id} role="option" aria-selected={index === active}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
          <strong>{option.name}{option.abbreviation && ` (${option.abbreviation})`}</strong>
          <small>{[option.university, option.state].filter(Boolean).join(" · ")}</small>
        </li>)}
      </ul>}
      <p role="status">{loading ? "Searching student associations…" : failed ? "Directory temporarily unavailable. You can still enter the association name." : value.trim().length < 2 ? "Type at least 2 characters to search." : options.length ? "Choose an association, or keep the name you entered." : "No matches. You can keep the name you entered."}</p>
    </div>}
    <p id={`${uid}-hint`} className="mt-2 text-xs text-gray-600">Search Malaysian student associations across Australia, or enter another organiser’s name.</p>
    {error && <p id={`${uid}-error`} role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </div>;
}
