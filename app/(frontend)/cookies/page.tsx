import type { Metadata } from "next";

import CookiePreferencesButton from "@/components/CookiePreferencesButton";
import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Notice",
  description:
    "How MASCA Australia uses cookies and similar browser storage, including controls for optional analytics.",
  path: "/cookies",
});

export default function CookieNoticePage() {
  return (
    <LegalPage
      eyebrow="Privacy controls"
      title="Cookie notice"
      summary="This notice explains the cookies and similar browser storage used by MASCA Australia, including which functions are necessary and which are optional."
    >
      <section>
        <h2>Your current choice</h2>
        <p>
          Optional analytics remain off until you allow them. You can review or
          change your choice at any time using the button below or the “Cookie
          preferences” link in the website footer.
        </p>
        <CookiePreferencesButton className="mt-5 min-h-11 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-bold text-white no-underline transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" />
      </section>

      <section>
        <h2>What we mean by cookies</h2>
        <p>
          “Cookies” is commonly used as a broad term for cookies and similar
          technologies, including local browser storage. These tools can remember
          a choice, maintain a secure session or help a website understand how it
          performs.
        </p>
      </section>

      <section>
        <h2>Necessary storage</h2>
        <p>
          Necessary storage supports functions you request or helps keep the
          service secure. It cannot be disabled through our preference panel.
        </p>
        <ul>
          <li>
            <strong>Privacy preference:</strong> the key{" "}
            <code>masca:privacy-preferences:v1</code> is stored locally in your
            browser to remember whether you allowed optional analytics. It
            remains until you clear site data or MASCA replaces the preference
            version.
          </li>
          <li>
            <strong>CMS administration:</strong> authorised committee members
            may receive essential session, security and interface-preference
            cookies when using the private <code>/admin</code> area.
          </li>
        </ul>
      </section>

      <section>
        <h2>Optional analytics and performance</h2>
        <p>
          If you select “Allow analytics”, the site loads Vercel Web Analytics
          and Speed Insights. Web Analytics provides anonymised traffic
          information without placing third-party cookies. Speed Insights
          measures real-user website performance, including Core Web Vitals.
          These services may process technical information such as the page
          visited, approximate location, browser or device details, timestamps
          and performance measurements.
        </p>
        <p>
          MASCA uses this information to understand which pages are useful and
          to identify performance issues. We do not use advertising cookies or
          MASCA-controlled cross-site behavioural tracking.
        </p>
      </section>

      <section>
        <h2>External websites</h2>
        <p>
          Our pages link to social networks, event sites and other organisations.
          Following those links may allow the external site to use its own
          cookies or tracking technologies. Their privacy and cookie notices
          apply independently of MASCA&apos;s settings.
        </p>
      </section>

      <section>
        <h2>Browser controls</h2>
        <p>
          You can also delete or block site data using your browser settings.
          Clearing the MASCA site&apos;s storage removes your saved preference, so
          we will ask you again on your next visit. Blocking necessary cookies
          may prevent the CMS administration area from working correctly.
        </p>
      </section>

      <section>
        <h2>Updates</h2>
        <p>
          We will update this notice when our storage or analytics practices
          materially change. See our <a href="/privacy">privacy policy</a> for
          broader information about how MASCA handles personal information.
        </p>
      </section>
    </LegalPage>
  );
}
