import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://amitrege.com",
  output: "static",
  redirects: {
    "/about": "/"
  },
  integrations: [sitemap()]
});
