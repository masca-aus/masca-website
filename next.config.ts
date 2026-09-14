import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The careers board lived at /career while under construction; keep the
  // old address working for anyone who bookmarked or shared it.
  async redirects() {
    return [{ source: "/career", destination: "/careers", permanent: true }];
  },
};

export default withPayload(nextConfig);
