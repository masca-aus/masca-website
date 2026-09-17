'use client';

import React, { createContext, useCallback, useContext, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { DefaultEditView, useDocumentInfo } from '@payloadcms/ui';
import type { DocumentViewClientProps } from 'payload';
import { firstIncompleteEventStep } from '@/features/events/eventEditor';
import './eventEditor.css';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
export type SaveIntent = 'draft' | 'publish' | 'exit' | 'unpublish';
type EditorContext = {
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
  saveState: SaveState;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  registerSave: (handler: ((intent: SaveIntent) => Promise<boolean>) | null) => void;
  save: React.RefObject<((intent: SaveIntent) => Promise<boolean>) | null>;
};
const Context = createContext<EditorContext | null>(null);
export function useEventEditor() {
  const context = useContext(Context);
  if (!context) throw new Error('Event editor requires EventEditorView');
  return context;
}

export function EventEditorView(props: DocumentViewClientProps) {
  const { data, id } = useDocumentInfo();
  const [step, setStep] = useState(() => id ? firstIncompleteEventStep(data ?? {}) : 0);
  const [saveState, setSaveState] = useState<SaveState>(id ? 'saved' : 'idle');
  const [error, setError] = useState('');
  const save = useRef<((intent: SaveIntent) => Promise<boolean>) | null>(null);
  const registerSave = useCallback((handler: ((intent: SaveIntent) => Promise<boolean>) | null) => { save.current = handler; }, []);
  return (
    <Context.Provider value={{ step, setStep, saveState, setSaveState, error, setError, save, registerSave }}>
      <div className="masca-event-editor" data-step={step} onSubmitCapture={(event) => {
        if (!(event.target instanceof HTMLFormElement) || !event.target.matches('.collection-edit--events > form')) return;
        // Native Enter submission must use the same single writer as autosave.
        event.preventDefault();
        event.stopPropagation();
        void save.current?.('draft');
      }}>
        <DefaultEditView {...props} />
      </div>
    </Context.Provider>
  );
}

/** Publishing is deliberately offered only after the event preview. */
export function EventPublishControl() { return null; }

export function EventUnpublishControl() {
  const { save, saveState } = useEventEditor();
  const { hasPublishedDoc, hasPublishPermission } = useDocumentInfo();
  if (!hasPublishedDoc || !hasPublishPermission) return null;
  return <button type="button" className="masca-wizard-secondary" disabled={saveState === 'saving'} onClick={() => void save.current?.('unpublish')}>Unpublish event</button>;
}
