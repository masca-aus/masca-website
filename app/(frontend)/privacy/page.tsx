import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "How MASCA Australia collects, uses, stores and protects personal information through its website and content management system.",
  path: "/privacy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      summary="This policy explains what personal information MASCA Australia handles through this website, why we need it, and the choices available to you."
    >
      <section>
        <h2>Who we are</h2>
        <p>
          The Malaysian Students&apos; Council of Australia (MASCA Australia) is
          the national representative body for Malaysian students in Australia.
          In this policy, “MASCA”, “we”, “us” and “our” refer to MASCA Australia.
        </p>
        <p>
          This policy covers the MASCA Australia website, its administration
          area and enquiries submitted through the website. Separate MASCA state
          chapters or external websites may publish their own privacy terms.
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <h3>Information you give us</h3>
        <ul>
          <li>
            Contact details and enquiry content, such as your name, email
            address, affiliation, state, topic and message.
          </li>
          <li>
            Information supplied by committee members, partners and sponsors
            for publication, such as names, roles, biographies, portraits and
            organisation logos.
          </li>
          <li>
            Account details used by authorised committee members to access the
            content management system.
          </li>
        </ul>

        <h3>Information collected when you use the site</h3>
        <p>
          Our hosting and security providers may process technical records such
          as IP address, device or browser type, requested pages, timestamps and
          diagnostic logs. If you allow optional analytics, we also receive
          aggregated usage and website performance information. See our{" "}
          <a href="/cookies">cookie notice</a> for more detail and controls.
        </p>
      </section>

      <section>
        <h2>How we use information</h2>
        <p>We use personal information where reasonably necessary to:</p>
        <ul>
          <li>respond to enquiries and direct them to the relevant MASCA team;</li>
          <li>operate, secure, maintain and improve the website;</li>
          <li>publish approved committee, partner and sponsor information;</li>
          <li>manage authorised access to the content management system;</li>
          <li>understand website performance where analytics consent is given;</li>
          <li>meet legal obligations and respond to misuse or security incidents.</li>
        </ul>
        <p>
          We do not sell personal information or use this website for behavioural
          advertising.
        </p>
      </section>

      <section>
        <h2>When information is shared</h2>
        <p>
          Information may be accessible to authorised MASCA committee members
          and to service providers that help us operate the website. These
          currently include Vercel for hosting and optional analytics, Supabase
          for database and media infrastructure, and Resend for delivering
          website enquiries by email.
        </p>
        <p>
          We may also disclose information where you ask us to, where required
          by law, or where reasonably necessary to protect people, MASCA or the
          integrity of our services. Links to third-party websites are governed
          by those sites&apos; own privacy practices.
        </p>
      </section>

      <section>
        <h2>Storage, overseas processing and security</h2>
        <p>
          MASCA and its service providers may process information in Australia
          and in other countries where their infrastructure or personnel are
          located. Our current database infrastructure is hosted in South Korea.
          Privacy protections and legal requirements may differ between
          countries.
        </p>
        <p>
          We use reasonable administrative and technical safeguards appropriate
          to the information we handle, including restricted CMS access and
          managed service providers. No internet transmission or storage system
          can be guaranteed completely secure.
        </p>
      </section>

      <section>
        <h2>Retention</h2>
        <p>
          We keep information only for as long as reasonably needed for the
          purposes described in this policy, MASCA&apos;s operational records,
          dispute resolution, security or legal obligations. Enquiries may
          remain in MASCA email accounts, and provider logs or backups follow
          the relevant provider&apos;s retention cycle. We remove or de-identify
          information when it is no longer required where practicable.
        </p>
      </section>

      <section>
        <h2>Your choices and requests</h2>
        <p>
          You may ask to access or correct personal information we hold about
          you, request deletion where appropriate, withdraw analytics consent,
          or raise a privacy concern. Email{" "}
          <a href="mailto:hello@masca.org.au">hello@masca.org.au</a> with enough
          detail for us to identify the relevant information. We may need to
          verify your identity and may retain information where the law or a
          legitimate operational need requires it.
        </p>
      </section>

      <section>
        <h2>Applicable privacy frameworks</h2>
        <p>
          We aim to handle personal information consistently with the Australian
          Privacy Principles under the Privacy Act 1988 (Cth), and the Malaysian
          Personal Data Protection Act 2010 where those laws apply. These
          frameworks may not apply to every MASCA activity in the same way. Our{" "}
          <a href="/data-protection">data protection statement</a> explains the
          principles we follow in practice.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          We may update this policy as the website, our providers or applicable
          requirements change. The effective date at the top of this page shows
          when this version took effect. Material changes will be highlighted
          where reasonably practicable.
        </p>
      </section>
    </LegalPage>
  );
}
