import type { Metadata } from "next";
import localFont from "next/font/local"
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

import GsapInitializer from "@/utils/GsapInitializer";
import NavBar from "@/components/NavBar";
import WalkingCrowd from "@/components/WalkingCrowd";
import Footer from "@/components/Footer";
import { getCastPeeps } from "@/utils/casts";

// 1. Montserrat (Primary Variable Font - Split into Roman and Italic files)
const montserrat = localFont({
  src: [
    {
      path: "./fonts/Montserrat-VariableFont_wght.ttf",
      style: "normal",
    },
    {
      path: "./fonts/Montserrat-Italic-VariableFont_wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-montserrat",
   preload: false,
});

// 2. Crimson Text (Secondary Font - Array of all static weight and style files)
const crimsonText = localFont({
  src: [
    {
      path: "./fonts/CrimsonText-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/CrimsonText-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-SemiBoldItalic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./fonts/CrimsonText-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/CrimsonText-BoldItalic.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-crimson",
   preload: false,
});

// 3. Brusher (Accent Script Font)
const brusher = localFont({
  src: "./fonts/Brusher.ttf",
  variable: "--font-brusher",
   preload: false,
});

export const metadata: Metadata = {
  title: "Malaysia Students' Council of Australia",
  description: "The Malaysian Students' Council of Australia (MASCA) is the official, peak student representative body for Malaysian students in Australia. Established in April 2001, it operates as a non-profit organization across six states and one territory to advocate for students' welfare, promote academic excellence, and celebrate Malaysian culture.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const peeps = getCastPeeps();

  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${crimsonText.variable} ${brusher.variable} antialiased`}
    >
      <body>
        <GsapInitializer />
        <NavBar />
        {children}
        <Analytics/>
        <WalkingCrowd peeps={peeps} />
        <Footer />
      </body>
    </html>
  );
}
