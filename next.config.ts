import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit uses __dirname to locate .afm font files at runtime.
  // Bundling it causes __dirname to resolve to a wrong path; keep it external.
  serverExternalPackages: ["pdfkit"],
  devIndicators: false,
};

export default nextConfig;
