import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Data Protection & PDPA",
  description:
    "MASCA Australia's practical data protection principles and approach to Australian privacy requirements and Malaysia's PDPA where applicable.",
  path: "/data-protection",
});

export default function DataProtectionPage() {
  return (
    <LegalPage
      eyebrow="Responsible data"
      title="Data protection & PDPA"
      summary="MASCA Australia follows practical data protection principles designed for a student-led organisation operating across Australia and engaging with Malaysia."
    >
      <section>
        <h2>Our approach</h2>
        <p>
          MASCA aims to manage personal information openly, fairly and securely.
          Our <a href="/privacy">privacy policy</a> describes our website
          practices. This statement sets out the broader principles we use when
          making day-to-day decisions about data.
        </p>
        <p>
          Depending on the activity and the people involved, Australian privacy
          requirements or Malaysia&apos;s Personal Data Protection Act 2010 (PDPA)
          may apply differently. We use these principles as a practical baseline
          and do not suggest that every law applies to every MASCA activity.
        </p>
      </section>

      <section>
        <h2>Principles we follow</h2>
        <ol>
          <li>
            <strong>Accountability and transparency.</strong> We identify who is
            responsible for systems and explain our data practices in clear
            language.
          </li>
          <li>
            <strong>Notice and choice.</strong> We explain why information is
            requested and provide meaningful choices where appropriate.
          </li>
          <li>
            <strong>Purpose limitation and minimisation.</strong> We collect only
            what is reasonably needed and avoid reusing it for unrelated
            purposes without a suitable basis.
          </li>
          <li>
            <strong>Accuracy.</strong> We take reasonable steps to keep important
            records current and allow people to request corrections.
          </li>
          <li>
            <strong>Security and access control.</strong> Access is limited to
            people who need it for MASCA responsibilities, supported by managed
            infrastructure and account controls.
          </li>
          <li>
            <strong>Retention and disposal.</strong> Information is kept only as
            long as reasonably needed, then deleted or de-identified where
            practicable.
          </li>
          <li>
            <strong>Responsible disclosure and overseas processing.</strong> We
            consider the purpose, safeguards and location before sharing data
            with another team or provider.
          </li>
          <li>
            <strong>Access and correction.</strong> We provide a clear route for
            people to ask about their information and respond within a reasonable
            period.
          </li>
        </ol>
      </section>

      <section>
        <h2>Committee responsibilities</h2>
        <p>
          Committee members with access to personal information should use it
          only for authorised MASCA work, avoid unnecessary copies, protect
          accounts and devices, and remove access when roles change. Public
          committee profiles and photographs should be published with the
          person&apos;s knowledge and kept accurate during the relevant term.
        </p>
      </section>

      <section>
        <h2>Data incidents</h2>
        <p>
          Suspected loss, unauthorised access or disclosure should be reported
          promptly to MASCA. We will work to contain the issue, preserve relevant
          information, assess the likely impact, reduce further harm and notify
          affected people or authorities where required.
        </p>
      </section>

      <section>
        <h2>Requests and complaints</h2>
        <p>
          Contact <a href="mailto:hello@masca.org.au">hello@masca.org.au</a> to
          request access or correction, ask how information was handled, or make
          a complaint. Include a concise description and relevant dates. We may
          verify your identity before releasing information and will explain the
          outcome of our review.
        </p>
        <p>
          If a concern is not resolved, you may be able to contact the{" "}
          <a
            href="https://www.oaic.gov.au/privacy/privacy-complaints"
            target="_blank"
            rel="noopener noreferrer"
          >
            Office of the Australian Information Commissioner
          </a>{" "}
          or Malaysia&apos;s{" "}
          <a
            href="https://www.pdp.gov.my/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Personal Data Protection Commissioner
          </a>
          , depending on which framework applies.
        </p>
      </section>
    </LegalPage>
  );
}
