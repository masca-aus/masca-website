"use client";

import { OPEN_PRIVACY_PREFERENCES_EVENT } from "@/utils/privacyPreferences";

type CookiePreferencesButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

export default function CookiePreferencesButton({
  className,
  children = "Cookie preferences",
}: CookiePreferencesButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() =>
        window.dispatchEvent(new Event(OPEN_PRIVACY_PREFERENCES_EVENT))
      }
    >
      {children}
    </button>
  );
}
