import Image from "next/image";
import Link from "next/link";

// `external: true` opens the link in a new tab (use for off-site URLs).
type FooterLink = { label: string; href: string; external?: boolean };

// Link arrays per footer section. Add/remove items here — the markup below
// renders whatever is in each `links` array.
const footerSections: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Community",
    links: [
      { label: "Events", href: "/events" },
      { label: "Welfare", href: "/care" },
      { label: "MASCAvoice", href: "https://www.instagram.com/mascavoice/", external: true },
      { label: "Muafakat", href: "https://www.muafakatgames2024.com/index.html", external: true },
    ],
  },
  {
    heading: "About",
    links: [
      { label: "Our Story", href: "/about" },
      { label: "Leadership", href: "/" },
      { label: "Partners", href: "/about" },
      { label: "Contact us", href: "/contact" },
    ],
  },
  {
    heading: "Connect",
    links: [
      { label: "Instagram", href: "https://www.instagram.com/masca_national/", external: true },
      { label: "Facebook", href: "https://www.facebook.com/nationalmasca", external: true },
      { label: "X", href: "https://x.com/masca_national/", external: true },
      { label: "Linkedin", href: "https://au.linkedin.com/company/masca", external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-blue-600 text-white">

      <div className="max-w-7xl mx-auto px-6 py-16 sm:px-10 md:px-16 md:py-24 lg:py-32">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 items-start md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-10">

          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <div className="flex gap-4 items-center">
              <Image src="/logo/logo_dark.svg" alt="Masca logo" width={40} height={40} />
              <span className="text-xl font-bold tracking-wider">MASCA</span>
            </div>
            <p className="text-body-sm text-gray-300">
              The peak student representative body for Malaysians in Australia. Founded 2001 · run by students, for students.
            </p>
          </div>

          {footerSections.map((section) => (
            <div key={section.heading} className="flex flex-col gap-3">
              <span className="eyebrow text-yellow-500">{section.heading}</span>
              <ul className="flex flex-col gap-2 text-body-sm text-gray-300">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-block py-0.5 transition-colors hover:text-white"
                      {...(link.external && {
                        target: "_blank",
                        rel: "noopener noreferrer",
                      })}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <span className="inline-flex md:hidden text-h2 font-accent text-yellow-500 self-center justify-self-start">
            Terima <br/> Kasih
          </span>
        </div>

        <div className="mt-12 border-t border-blue-100/20 pt-6 flex flex-row justify-between">
          <span className="text-caption text-gray-300">
            © {new Date().getFullYear()} &thinsp; MASCA &thinsp; &middot; &thinsp; Malaysian Students&apos; Council of Australia
          </span>
          <span className="md:inline-flex hidden text-h3 font-accent text-yellow-500">
            Terima Kasih
          </span>
        </div>
      </div>
    </footer>
  );
}
