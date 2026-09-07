export type PrivacyPreferences = {
  analytics: boolean;
  savedAt: string;
  version: 1;
};

export const PRIVACY_PREFERENCES_STORAGE_KEY = "masca:privacy-preferences:v1";
export const OPEN_PRIVACY_PREFERENCES_EVENT = "masca:open-privacy-preferences";
export const PRIVACY_PREFERENCES_CHANGED_EVENT =
  "masca:privacy-preferences-changed";

export function createPrivacyPreferences(
  analytics: boolean,
  savedAt = new Date().toISOString(),
): PrivacyPreferences {
  return {
    analytics,
    savedAt,
    version: 1,
  };
}

export function parsePrivacyPreferences(raw: string | null): PrivacyPreferences | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "analytics" in parsed &&
      typeof parsed.analytics === "boolean" &&
      "savedAt" in parsed &&
      typeof parsed.savedAt === "string" &&
      "version" in parsed &&
      parsed.version === 1
    ) {
      return {
        analytics: parsed.analytics,
        savedAt: parsed.savedAt,
        version: 1,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function shouldLoadAnalytics(raw: string | null) {
  return parsePrivacyPreferences(raw)?.analytics === true;
}
