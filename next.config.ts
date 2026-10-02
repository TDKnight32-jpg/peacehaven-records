import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Room for a results photo (capped at 4MB in lib/submissions.ts) plus
      // the rest of the /submit form. Vercel rejects request bodies over
      // 4.5MB regardless of this setting.
      bodySizeLimit: "4.5mb",
    },
  },
};

export default nextConfig;
