'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useConfig, useDocumentInfo, useForm, useFormFields, useFormModified } from '@payloadcms/ui';
import { createEventSaveQueue } from '@/features/events/eventSaveQueue';
import { eventDraftFingerprint, eventFieldStep, validateEventStep } from '@/features/events/eventEditor';
import { useEventEditor, type SaveIntent } from './EventEditorView';

/** Owns all event writes, including the first draft. Native autosave stays off to
 * avoid a second writer racing explicit publish or creating a second record. */
export function EventSaveController() {
  const editor = useEventEditor();
  const { registerSave } = editor;
  const form = useForm();
  const document = useDocumentInfo();
  const { config } = useConfig();
  const router = useRouter();
  const modified = useFormModified();
  const fingerprint = useFormFields(([fields]) => eventDraftFingerprint(Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.value]),
  )));
  const queue = useRef(createEventSaveQueue());
  const saved = useRef(fingerprint);
  const [savedFingerprint, setSavedFingerprint] = useState(fingerprint);
  const creating = useRef(false);
  const explicitAction = useRef(false);
  const latest = useRef({ editor, form, document, config, router, fingerprint });
  useEffect(() => { latest.current = { editor, form, document, config, router, fingerprint }; });

  useEffect(() => {
    const save = async (intent: SaveIntent): Promise<boolean> => {
      if (intent !== 'draft' && explicitAction.current) return false;
      if (intent !== 'draft') explicitAction.current = true;
      try {
        return await queue.current.run(async () => {
          const { form, document, editor, config, router } = latest.current;
          if (document.isInitializing || !document.hasSavePermission || document.uploadStatus === 'uploading') return false;
          // A successful POST redirects through Payload to the new record. Do not
          // issue another POST while that route transition is in progress.
          const id = document.id ?? document.data?.id;
          if (creating.current && !id) return false;
          if (intent === 'unpublish') {
            if (!id) return false;
            editor.setSaveState('saving');
            editor.setError('');
            try {
              // Payload's unpublish flag skips content validation, including
              // incomplete values in the latest saved draft.
              const response = await fetch(`${config.routes.api}/events/${id}?depth=0&unpublishAllLocales=true`, {
                method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _status: 'draft' }),
              });
              if (!response.ok) throw new Error('Unpublish failed');
              document.setHasPublishedDoc(false);
              form.dispatchFields({ type: 'UPDATE', path: '_status', value: 'draft' });
              editor.setSaveState('saved');
              return true;
            } catch {
              editor.setSaveState('error');
              editor.setError('The event could not be unpublished. Try Unpublish event again.');
              return false;
            }
          }
          const data = form.getData();
          const snapshot = eventDraftFingerprint(data);
          if (intent === 'publish') {
            const errors = { ...validateEventStep(data, 4), ...editor.dateSelectionValidationRef?.current?.() };
            if (Object.keys(errors).length) {
              form.dispatchFields({ type: 'ADD_SERVER_ERRORS', errors: Object.entries(errors).map(([path, message]) => ({ path, message })) });
              form.setSubmitted(true);
              editor.setStep(eventFieldStep(Object.keys(errors)[0]));
              editor.setError('Please complete the highlighted details before publishing.');
              return false;
            }
          }
          if (intent === 'draft' && snapshot === saved.current) return true;
          if (intent === 'exit' && snapshot === saved.current && id) {
            router.push('/admin/collections/events');
            return true;
          }
          editor.setSaveState('saving');
          editor.setError('');
          const isDraft = intent !== 'publish';
          const action = `${config.routes.api}/events${id ? `/${id}` : ''}?depth=0${isDraft ? `&draft=true${id ? '&autosave=true' : ''}` : ''}`;
          let result;
          form.setBackgroundProcessing(true);
          try {
            result = await form.submit({
              action,
              method: id ? 'PATCH' : 'POST',
              skipValidation: isDraft,
              disableFormWhileProcessing: intent !== 'draft' || !id,
              disableSuccessStatus: intent === 'draft',
              context: isDraft ? { getDocPermissions: false, incrementVersionCount: !document.mostRecentVersionIsAutosaved } : undefined,
              acceptValues: intent === 'draft' ? { overrideLocalChanges: false } : true,
              overrides: isDraft ? { _status: 'draft' } : { _status: 'published', reviewStatus: 'approved', reviewedAt: new Date().toISOString() },
            });
          } catch {
            // Payload normally handles transport errors, but retain the form if
            // an adapter throws instead of returning a failed response.
          } finally {
            form.setBackgroundProcessing(false);
          }
          if (!result?.res?.ok) {
            form.setModified(true);
            editor.setSaveState('error');
            editor.setError('Your changes could not be saved. Keep this page open and try again.');
            const invalid = Object.entries(form.getFields()).find(([, field]) => field.valid === false);
            if (intent === 'publish' && invalid) editor.setStep(eventFieldStep(invalid[0]));
            return false;
          }
          if (!id) creating.current = true;
          saved.current = intent === 'publish' ? eventDraftFingerprint({ ...data, reviewStatus: 'approved' }) : snapshot;
          setSavedFingerprint(saved.current);
          if (eventDraftFingerprint(form.getData()) !== saved.current) form.setModified(true);
          editor.setSaveState('saved');
          if (intent === 'publish') {
            document.setHasPublishedDoc(true);
            document.setMostRecentVersionIsAutosaved(false);
            document.setUnpublishedVersionCount(0);
            editor.setStep(4);

          } else {
            document.setMostRecentVersionIsAutosaved(true);
            document.setUnpublishedVersionCount(count => Math.max(count, 1));
          }
          if (intent === 'exit') router.push('/admin/collections/events');
          return true;
        });
      } finally {
        if (intent !== 'draft') explicitAction.current = false;
      }
    };
    registerSave(save);
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('.collection-edit') && !event.target.closest('.collection-edit--events'))) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void save('draft');
      }
    };
    window.addEventListener('keydown', shortcut);
    return () => { registerSave(null); window.removeEventListener('keydown', shortcut); };
  }, [registerSave]);

  useEffect(() => {
    if (!modified || fingerprint === saved.current || editor.saveState === 'error') return;
    const timeout = setTimeout(() => { void editor.save.current?.('draft'); }, 2000);
    return () => clearTimeout(timeout);
  }, [fingerprint, modified, editor.save, editor.saveState]);

  const indicator = <span className="masca-save-indicator" role="status" aria-live="polite">
    {editor.saveState === 'saving' ? 'Saving…' : editor.saveState === 'error' ? 'Save failed' : modified && fingerprint !== savedFingerprint ? 'Unsaved changes' : editor.saveState === 'saved' ? 'Saved' : 'Your draft saves automatically'}
  </span>;
  return editor.saveStatusTarget ? createPortal(indicator, editor.saveStatusTarget) : indicator;
}
