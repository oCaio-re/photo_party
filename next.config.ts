import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The admin panel moved to the root; keep old bookmarks and copied links working
    return [{ source: "/admin", destination: "/", permanent: false }];
  },
};

export default nextConfig;
