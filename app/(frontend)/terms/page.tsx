import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description:
    "The terms that apply when using the MASCA Australia website and its published information.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Website terms"
      title="Terms of use"
      summary="These terms set out the fair and responsible use of the MASCA Australia website. By using the site, you agree to these terms."
    >
      <section>
        <h2>About these terms</h2>
        <p>
          This website is operated by the Malaysian Students&apos; Council of
          Australia (MASCA Australia). If you do not agree with these terms,
          please do not use the website. Our <a href="/privacy">privacy policy</a>{" "}
          and <a href="/cookies">cookie notice</a> also apply to your use of the
          site.
        </p>
      </section>

      <section>
        <h2>Information and availability</h2>
        <p>
          We aim to keep website information accurate and current, but student
          leadership, events, opportunities and external requirements can change
          quickly. Website content is general information, not legal, financial,
          health, migration, education or other professional advice. Confirm
          important details with the relevant organiser or qualified adviser.
        </p>
        <p>
          We may change, suspend or remove website content or features without
          notice. We do not guarantee that the website will always be available,
          uninterrupted or error-free.
        </p>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>You must not use the website to:</p>
        <ul>
          <li>break the law, mislead others or infringe another person&apos;s rights;</li>
          <li>attempt unauthorised access to accounts, systems or data;</li>
          <li>introduce malicious code or interfere with website operation;</li>
          <li>scrape, overload or probe the website in a harmful manner;</li>
          <li>impersonate MASCA, a committee member or another person.</li>
        </ul>
        <p>
          Authorised CMS users must protect their sign-in details, use access
          only for MASCA work and promptly report suspected account misuse.
        </p>
      </section>

      <section>
        <h2>Content you submit</h2>
        <p>
          When you send material for publication, you confirm that it is accurate
          to the best of your knowledge and that you have the right to provide
          it. You allow MASCA to store, edit and publish that material for the
          purpose for which it was supplied. Do not submit confidential or
          sensitive information unless MASCA has specifically asked for it.
        </p>
      </section>

      <section>
        <h2>Intellectual property</h2>
        <p>
          Unless stated otherwise, MASCA owns or is licensed to use the website
          design, text, graphics and branding. You may view and share links to
          the site for personal, educational and non-commercial purposes. Do not
          reproduce MASCA branding or substantial website content in a way that
          suggests endorsement or affiliation without permission.
        </p>
        <p>
          Third-party names, logos, photographs and other material remain the
          property of their respective owners.
        </p>
      </section>

      <section>
        <h2>External links and sponsors</h2>
        <p>
          Links to third-party websites are provided for convenience. MASCA does
          not control those websites and is not responsible for their content,
          security or privacy practices. Displaying a sponsor or partner does
          not mean MASCA endorses every product, service or statement they offer.
        </p>
      </section>

      <section>
        <h2>Responsibility and liability</h2>
        <p>
          To the extent permitted by law, MASCA is not liable for loss arising
          from reliance on general website information, website unavailability,
          or third-party content. Nothing in these terms excludes a guarantee,
          right or remedy that cannot lawfully be excluded, including applicable
          rights under Australian consumer law.
        </p>
      </section>

      <section>
        <h2>Changes and governing law</h2>
        <p>
          We may update these terms and will change the effective date when we
          do. These terms are governed by the laws applicable in Australia. Any
          mandatory rights you have under the law of your location continue to
          apply.
        </p>
      </section>
    </LegalPage>
  );
}
