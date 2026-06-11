import { ImageResponse } from "next/og";

import { SITE_NAME, SITE_SHORT_NAME } from "@/utils/seo";

// Route segment config for the generated image.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = SITE_NAME;

// Branded social-share card reused as the default Open Graph / Twitter image
// across the whole site. Colours mirror the brand tokens in globals.css
// (blue #010066, yellow #FFCC00).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          background: "linear-gradient(135deg, #010066 0%, #34389A 100%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            lineHeight: 1,
            color: "#FFCC00",
            letterSpacing: "-0.04em",
          }}
        >
          {SITE_SHORT_NAME}
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 48,
            fontWeight: 600,
            maxWidth: 900,
            lineHeight: 1.2,
          }}
        >
          {SITE_NAME}
        </div>
      </div>
    ),
    { ...size },
  );
}
