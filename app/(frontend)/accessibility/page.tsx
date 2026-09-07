import type { Metadata } from "next";

import LegalPage from "@/components/LegalPage";
import { pageMetadata } from "@/utils/seo";

export const metadata: Metadata = pageMetadata({
  title: "Accessibility",
  description:
    "MASCA Australia's commitment to an inclusive, usable website and how to request accessibility support or alternative formats.",
  path: "/accessibility",
});

export default function AccessibilityPage() {
  return (
    <LegalPage
      eyebrow="Inclusive access"
      title="Accessibility statement"
      summary="MASCA Australia wants its digital information and services to be usable by Malaysian students and community members with diverse needs, devices and abilities."
    >
      <section>
        <h2>Our commitment</h2>
        <p>
          We are working toward conformance with the Web Content Accessibility
          Guidelines (WCAG) 2.2 Level AA. This is an ongoing commitment rather
          than a claim that every page or third-party service is currently fully
          conformant.
        </p>
      </section>

      <section>
        <h2>What the website supports</h2>
        <p>Our website is designed to support:</p>
        <ul>
          <li>semantic headings, landmarks and a skip-to-content link;</li>
          <li>keyboard access to primary navigation and interactive controls;</li>
          <li>visible focus styles and clear link or button labels;</li>
          <li>responsive layouts across common screen sizes;</li>
          <li>text alternatives for meaningful images where supplied;</li>
          <li>readable colour contrast and controls that do not rely on colour alone.</li>
        </ul>
      </section>

      <section>
        <h2>Known limitations</h2>
        <p>
          Some older content, third-party websites, embedded services or uploaded
          media may not provide the same level of accessibility as the core MASCA
          website. Committee content changes over time, so an image description,
          document structure or external event page may occasionally need
          improvement.
        </p>
        <p>
          We prioritise issues that block access to essential information or
          tasks and will provide a reasonable alternative where practicable.
        </p>
      </section>

      <section>
        <h2>Ask for help or an alternative format</h2>
        <p>
          If you cannot access content or complete an action, email{" "}
          <a href="mailto:hello@masca.org.au">hello@masca.org.au</a>. If
          possible, include:
        </p>
        <ul>
          <li>the page address or name of the content;</li>
          <li>what you were trying to do and what went wrong;</li>
          <li>your browser, device or assistive technology, if relevant;</li>
          <li>the format or support that would work for you.</li>
        </ul>
        <p>
          You do not need to disclose a disability. We will acknowledge the
          request and work with the responsible MASCA team on a practical
          response.
        </p>
      </section>

      <section>
        <h2>Feedback</h2>
        <p>
          Accessibility feedback helps a student-led team identify barriers we
          may not see during routine testing. Please contact us if something is
          difficult to read, understand, navigate or operate, even if you already
          found a workaround.
        </p>
      </section>
    </LegalPage>
  );
}
