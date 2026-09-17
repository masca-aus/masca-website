'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useField } from '@payloadcms/ui';
import type { TextFieldClientComponent, Validate } from 'payload';
import './organisationSearch.css';

type Option = { id: number | string; name: string; abbreviation?: string; university?: string; state?: string };
const validateOrganisation: Validate = value => typeof value === 'string' && value.trim() ? true : 'Enter an organisation.';

export const OrganisationSearchField: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, disabled, showError, errorMessage } = useField<string>({ path: path || 'organisation', validate: validateOrganisation });
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Option[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('ready');
  const [active, setActive] = useState(-1);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const locked = Boolean(readOnly || disabled);

  useEffect(() => {
    if (!open || locked) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const query = new URLSearchParams({ limit: '10', depth: '0', sort: 'name', 'where[listed][equals]': 'true' });
      const search = value?.trim();
      if (search) ['name', 'abbreviation', 'university', 'aliases'].forEach((key, index) => query.set(`where[or][${index}][${key}][contains]`, search));
      try {
        const response = await fetch(`/api/organisations?${query}`, { signal: controller.signal, credentials: 'same-origin' });
        if (!response.ok) throw new Error('Directory unavailable');
        const result = await response.json();
        if (!Array.isArray(result.docs)) throw new Error('Invalid directory response');
        if (!controller.signal.aborted) {
          setOptions(result.docs.filter((doc: Option) => typeof doc.name === 'string' && doc.name.trim()));
          setStatus('ready');
        }
      } catch {
        if (!controller.signal.aborted) { setOptions([]); setStatus('error'); }
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [value, open, locked]);

  const choose = (option: Option) => { setValue(option.name); input.current?.focus(); setOpen(false); setActive(-1); };
  return <div className={`field-type text masca-organisation ${field.admin?.className ?? ''}`} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setOpen(false); setActive(-1); }
  }}>
    <label className="field-label" htmlFor={id}>Organisation <span aria-hidden="true">*</span></label>
    <input ref={input} id={id} role="combobox" type="text" autoComplete="off" value={value ?? ''} disabled={locked}
      aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={open && active >= 0 && options[active] ? `${id}-option-${active}` : undefined}
      aria-invalid={showError} aria-required="true" aria-describedby={`${id}-hint${showError ? ` ${id}-error` : ''}`}
      placeholder="Search by name, abbreviation or university"
      onFocus={() => { if (!locked) { setOpen(true); setStatus('loading'); setOptions([]); } }}
      onChange={event => { setValue(event.target.value); setOpen(true); setStatus('loading'); setOptions([]); setActive(-1); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          setActive(previous => options.length ? (event.key === 'ArrowDown' ? (previous + 1) % options.length : (previous <= 0 ? options.length - 1 : previous - 1)) : -1);
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (open && options[active]) choose(options[active]); else setOpen(false);
        }
      }} />
    {open && <div className="masca-organisation__results">
      <div className="masca-organisation__reveal" data-has-results={options.length > 0}>
      <ul id={`${id}-options`} role="listbox" aria-label="Matching organisations">
        {options.map((option, index) => <li id={`${id}-option-${index}`} key={option.id} role="option" aria-selected={index === active}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
          <strong>{option.name}{option.abbreviation && ` (${option.abbreviation})`}</strong>
          <small>{[option.university, option.state].filter(Boolean).join(' · ')}</small>
        </li>)}
      </ul>
      </div>
      <p role="status">{status === 'loading' && <span className="masca-organisation__loading" aria-hidden="true" />}{status === 'loading' ? 'Searching organisations…' : status === 'error' ? 'Directory unavailable. You can still enter the organisation name manually.' : options.length ? 'Choose a match, or keep the name you entered.' : 'No matches. You can keep the name you entered.'}</p>
      {value?.trim() && <button type="button" onClick={() => { input.current?.focus(); setOpen(false); }}>Use “{value.trim()}”</button>}
    </div>}
    <p id={`${id}-hint`} className="field-description">Search Malaysian student organisations across Australia, or enter another organiser’s name.</p>
    {showError && <p id={`${id}-error`} role="alert" className="masca-organisation__error">{errorMessage}</p>}
  </div>;
};
