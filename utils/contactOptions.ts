// Single source of truth for the contact form: the topic pills, the state
// dropdown, and the inbox each option routes a copy to. The routing maps are
// typed against the option lists, so adding or renaming an option without a
// matching routing entry is a type error.
//
// Note: the client form imports this module, so these addresses end up in
// the browser bundle. Keep only inboxes you're happy to be public here.

export const OWNER_EMAIL = "hello@masca.org.au"

export const CONTACT_TOPICS = [
  "General",
  "Join Us",
  "Events and Community",
  "Welfare and Academics",
  "Careers",
  "Sponsorship and Partnerships",
  "Brand and Media",
] as const

export const CONTACT_STATES = [
  "NSW",
  "VIC",
  "QLD",
  "WA",
  "SA",
  "TAS",
  "ACT",
  "Others",
] as const

export type ContactTopic = (typeof CONTACT_TOPICS)[number]
export type ContactState = (typeof CONTACT_STATES)[number]

export const DEFAULT_CONTACT_TOPIC: ContactTopic = "General"
export const DEFAULT_CONTACT_STATE: ContactState = "VIC"

// Each topic pill routes a copy to the inbox that owns it. `null` means no
// topic copy is sent.
export const TOPIC_CC: Record<ContactTopic, string | null> = {
  General: "secretariat@masca.org.au",
  "Join Us": "secretariat@masca.org.au",
  "Events and Community": "unites@masca.org.au",
  "Welfare and Academics": "cares@masca.org.au",
  Careers: "careers@masca.org.au",
  "Sponsorship and Partnerships": "treasury@masca.org.au",
  "Brand and Media": "amplifies@masca.org.au",
}

// Each state chapter can also CC its own inbox. `null` means that chapter has
// no dedicated inbox, so no chapter copy is sent.
export const STATE_CC: Record<ContactState, string | null> = {
  NSW: "nsw@masca.org.au",
  VIC: "vic@masca.org.au",
  QLD: "qld@masca.org.au",
  WA: "wa@masca.org.au",
  SA: "sa@masca.org.au",
  TAS: null,
  ACT: "act@masca.org.au",
  Others: "council@masca.org.au",
}

export function isContactTopic(value: string): value is ContactTopic {
  return (CONTACT_TOPICS as readonly string[]).includes(value)
}

export function isContactState(value: string): value is ContactState {
  return (CONTACT_STATES as readonly string[]).includes(value)
}
