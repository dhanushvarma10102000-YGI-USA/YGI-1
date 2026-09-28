import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The map guide was removed (Google Maps needs billing). Send old links and
  // search results to the blog; temporary so the page can come back later.
  async redirects() {
    return [{ source: "/guide", destination: "/blog", permanent: false }];
  },
};

export default nextConfig;

