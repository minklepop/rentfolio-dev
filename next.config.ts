import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit reads its font files relative to its own folder at runtime.
  // Bundling it rewrites that path and breaks the lookup, so keep it external.
  serverExternalPackages: ["pdfkit"],
  allowedDevOrigins: ["3.14.126.170"],
};

export default nextConfig;
