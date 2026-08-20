import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove a assinatura tecnológica dos cabeçalhos HTTP expostos ao público.
  poweredByHeader: false,
};

export default nextConfig;
