import type { MetadataRoute } from "next";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YourGuideInUSA",
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#2f8f86",
    icons: [
      {
        src: "/statue-liberty-mark.png",
        sizes: "48x64",
        type: "image/png",
      },
    ],
  };
}

