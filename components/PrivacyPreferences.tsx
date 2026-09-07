"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import {
  createPrivacyPreferences,
  OPEN_PRIVACY_PREFERENCES_EVENT,
  parsePrivacyPreferences,
  PRIVACY_PREFERENCES_CHANGED_EVENT,
  PRIVACY_PREFERENCES_STORAGE_KEY,
  type PrivacyPreferences as SavedPreferences,
} from "@/utils/privacyPreferences";

function subscribeToStoredPreferences(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(PRIVACY_PREFERENCES_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(PRIVACY_PREFERENCES_CHANGED_EVENT, onStoreChange);
  };
}

function getStoredPreferencesSnapshot(): string | null | undefined {
  try {
    return window.localStorage.getItem(PRIVACY_PREFERENCES_STORAGE_KEY);
  } catch {
    return null;
  }
}

function getServerPreferencesSnapshot(): string | null | undefined {
  return undefined;
}

type ConsentBannerProps = {
  onAllowAnalytics: () => void;
  onNecessaryOnly: () => void;
  onManagePreferences: () => void;
};

export function ConsentBanner({
  onAllowAnalytics,
  onNecessaryOnly,
  onManagePreferences,
}: ConsentBannerProps) {
  return (
    <section
      aria-labelledby="privacy-banner-title"
      className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-6xl rounded-2xl border border-blue-100 bg-white p-5 text-blue-700 shadow-[0_20px_70px_rgba(7,20,80,0.28)] sm:inset-x-6 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <p
            id="privacy-banner-title"
            className="mb-2 text-lg font-bold text-blue-700"
          >
            Your privacy, your choice
          </p>
          <p className="text-sm leading-6 text-gray-700">
            We use necessary browser storage to remember your preferences and
            keep the site secure. With your permission, privacy-friendly
            analytics help us improve the site. Read our{" "}
            <Link
              href="/cookies"
              className="font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-500"
            >
              cookie notice
            </Link>
            .
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={onNecessaryOnly}
            className="min-h-11 rounded-full border border-blue-200 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Necessary only
          </button>
          <button
            type="button"
            onClick={onManagePreferences}
            className="min-h-11 rounded-full border border-blue-200 px-5 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Manage preferences
          </button>
          <button
            type="button"
            onClick={onAllowAnalytics}
            className="min-h-11 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Allow analytics
          </button>
        </div>
      </div>
    </section>
  );
}

type PreferencesDialogProps = {
  analyticsAllowed: boolean;
  onAnalyticsChange: (allowed: boolean) => void;
  onClose: () => void;
  onSave: () => void;
};

export function PreferencesDialog({
  analyticsAllowed,
  onAnalyticsChange,
  onClose,
  onSave,
}: PreferencesDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-blue-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="privacy-dialog-title"
        aria-describedby="privacy-dialog-description"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-6 text-blue-700 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow text-blue-500">Privacy controls</span>
            <h2
              id="privacy-dialog-title"
              className="mt-2 text-2xl font-bold text-blue-700 sm:text-3xl"
            >
              Cookie preferences
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close cookie preferences"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-blue-100 text-2xl leading-none text-blue-700 transition hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <p
          id="privacy-dialog-description"
          className="mt-4 text-sm leading-6 text-gray-700"
        >
          Necessary storage keeps your choice and supports secure website
          administration. Optional analytics are loaded only when you allow
          them. You can change this setting at any time.
        </p>

        <div className="mt-7 divide-y divide-blue-100 rounded-2xl border border-blue-100">
          <div className="flex items-start justify-between gap-4 p-5">
            <div>
              <h3 className="font-bold text-blue-700">Necessary storage</h3>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                Remembers this choice and supports essential security and CMS
                sign-in functions.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
              Always on
            </span>
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-4 p-5">
            <span>
              <span className="block font-bold text-blue-700">
                Optional analytics
              </span>
              <span className="mt-1 block text-sm leading-6 text-gray-600">
                Helps MASCA understand anonymous site usage and performance so
                we can improve the experience.
              </span>
            </span>
            <span className="relative mt-1 shrink-0">
              <input
                type="checkbox"
                checked={analyticsAllowed}
                onChange={(event) => onAnalyticsChange(event.target.checked)}
                className="peer sr-only"
              />
              <span className="block h-7 w-12 rounded-full bg-gray-300 transition peer-checked:bg-blue-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600" />
              <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
            </span>
          </label>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/cookies"
            className="self-center text-sm font-semibold text-blue-600 underline decoration-blue-300 underline-offset-4 hover:text-blue-500"
          >
            Read the cookie notice
          </Link>
          <button
            type="button"
            onClick={onSave}
            className="min-h-11 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Save preferences
          </button>
        </div>
      </section>
    </div>
  );
}

export default function PrivacyPreferences() {
  const rawPreferences = useSyncExternalStore(
    subscribeToStoredPreferences,
    getStoredPreferencesSnapshot,
    getServerPreferencesSnapshot,
  );
  const [sessionPreferences, setSessionPreferences] =
    useState<SavedPreferences | null>(null);
  const storedPreferences =
    rawPreferences === undefined
      ? undefined
      : parsePrivacyPreferences(rawPreferences);
  const preferences = sessionPreferences ?? storedPreferences;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const openDialog = () => {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      let savedPreferences: SavedPreferences | null = null;
      try {
        savedPreferences = parsePrivacyPreferences(
          window.localStorage.getItem(PRIVACY_PREFERENCES_STORAGE_KEY),
        );
      } catch {
        // Fall back to the current session state if storage is blocked.
      }
      setDraftAnalytics(
        savedPreferences?.analytics ?? preferences?.analytics ?? false,
      );
      setDialogOpen(true);
    };

    window.addEventListener(OPEN_PRIVACY_PREFERENCES_EVENT, openDialog);
    return () =>
      window.removeEventListener(OPEN_PRIVACY_PREFERENCES_EVENT, openDialog);
  }, [preferences?.analytics]);

  const savePreferences = (analytics: boolean) => {
    const nextPreferences = createPrivacyPreferences(analytics);
    let persisted = false;
    try {
      window.localStorage.setItem(
        PRIVACY_PREFERENCES_STORAGE_KEY,
        JSON.stringify(nextPreferences),
      );
      persisted = true;
    } catch {
      // Keep the choice for this page view if storage is unavailable.
    }
    setSessionPreferences(persisted ? null : nextPreferences);
    window.dispatchEvent(new Event(PRIVACY_PREFERENCES_CHANGED_EVENT));
    setDialogOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  };

  const openDialog = () => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setDraftAnalytics(preferences?.analytics ?? false);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  };

  return (
    <>
      {preferences?.analytics === true && (
        <>
          <Analytics />
          <SpeedInsights />
        </>
      )}

      {preferences === null && !dialogOpen && (
        <ConsentBanner
          onNecessaryOnly={() => savePreferences(false)}
          onManagePreferences={openDialog}
          onAllowAnalytics={() => savePreferences(true)}
        />
      )}

      {dialogOpen && (
        <PreferencesDialog
          analyticsAllowed={draftAnalytics}
          onAnalyticsChange={setDraftAnalytics}
          onClose={closeDialog}
          onSave={() => savePreferences(draftAnalytics)}
        />
      )}
    </>
  );
}
