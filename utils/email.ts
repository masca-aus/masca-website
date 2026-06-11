"use server"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_KEY)

const OWNER_EMAIL = "hello@masca.org.au"

// Each contact topic pill routes a copy to the inbox that owns it.
const TOPIC_CC: Record<string, string | null> = {
  General: "exco@masca.org.au",
  Events: "exco@masca.org.au",
  Welfare: "cares@masca.org.au",
}

// Each state chapter can also CC its own inbox. `null` means that chapter has
// no dedicated inbox, so no chapter copy is sent.
const STATE_CC: Record<string, string | null> = {
  NSW: "chairperson@nsw.masca.org.au",
  VIC: "chairperson@vic.masca.org.au",
  QLD: null,
  WA: null,
  SA: null,
  TAS: null,
  ACT: null,
  Others: null,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type SendState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string }

export async function sendEmail(
  _prev: SendState,
  formData: FormData,
): Promise<SendState> {
  const name = ((formData.get("name") as string) ?? "").trim()
  const email = ((formData.get("email") as string) ?? "").trim()
  const affiliation = ((formData.get("affiliation") as string) ?? "").trim()
  const state = ((formData.get("state") as string) ?? "").trim()
  const topic = ((formData.get("topic") as string) ?? "").trim()
  const notes = ((formData.get("notes") as string) ?? "").trim()

  if (!name) return { status: "error", message: "Please enter your name." }
  if (!EMAIL_RE.test(email))
    return { status: "error", message: "Please enter a valid email address." }
  if (!notes)
    return {
      status: "error",
      message: "Please tell us a little about what you're looking for.",
    }

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  // Topic owns the primary CC; the chosen state chapter adds its own inbox
  // when it has one (deduped so a shared address isn't CC'd twice).
  const cc = [TOPIC_CC[topic], STATE_CC[state]].filter(
    (addr, i, all): addr is string => Boolean(addr) && all.indexOf(addr) === i,
  )
  const topicLabel = topic || "General"

  const row = (label: string, value: string) =>
    value
      ? `<tr><td style="padding:0 0 14px;">
            <p style="margin:0 0 2px;font-size:11px;letter-spacing:0.6px;text-transform:uppercase;color:#4A4A4A;font-weight:bold;">${label}</p>
            <p style="margin:0;font-size:15px;color:#000000;">${escape(value)}</p>
          </td></tr>`
      : ""

  const html = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2F2F8;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background-color:#FFFFFF;border:1px solid #E5E5F0;border-radius:12px;overflow:hidden;">
        <tr><td style="background-color:#010066;padding:24px 28px;">
          <p style="margin:0 0 6px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#FFCC00;font-weight:bold;">MASCA &middot; New enquiry</p>
          <h1 style="margin:0;font-size:20px;line-height:1.3;color:#FFFFFF;font-weight:bold;">${escape(topicLabel)} enquiry from ${escape(name)}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row("Name", name)}
            ${row("Email", email)}
            ${row("Affiliation", affiliation)}
            ${row("State chapter", state)}
            ${row("Topic", topicLabel)}
          </table>
          <p style="margin:24px 0 8px;font-size:11px;letter-spacing:0.6px;text-transform:uppercase;color:#4A4A4A;font-weight:bold;">Message</p>
          <div style="background-color:#F2F2F8;border-left:3px solid #FFCC00;border-radius:6px;padding:16px 18px;font-size:15px;line-height:1.6;color:#000000;">${escape(notes).replace(/\n/g, "<br/>")}</div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
            <tr><td style="background-color:#FFCC00;border-radius:8px;">
              <a href="mailto:${escape(email)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:bold;color:#00004D;text-decoration:none;">Reply to ${escape(name)} &rarr;</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #E5E5F0;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#4A4A4A;">Sent from the MASCA website contact form. Reply to this email to reach ${escape(name)} directly.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>`

  const text = [
    `New ${topicLabel} enquiry from ${name}`,
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    affiliation ? `Affiliation: ${affiliation}` : null,
    state ? `State chapter: ${state}` : null,
    `Topic: ${topicLabel}`,
    "",
    "Message:",
    notes,
  ]
    .filter((line) => line !== null)
    .join("\n")

  const { error } = await resend.emails.send({
    from: `${name} via Website <hello@masca.org.au>`,
    to: OWNER_EMAIL,
    cc: cc.length ? cc : undefined,
    replyTo: email || undefined,
    subject: `New ${topicLabel} enquiry from ${name || "website visitor"}`,
    html,
    text,
  })

  if (error) {
    return {
      status: "error",
      message: "Could not send your message. Please try again.",
    }
  }

  return { status: "success" }
}