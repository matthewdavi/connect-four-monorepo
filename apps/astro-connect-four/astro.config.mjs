// @ts-check
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import { fileURLToPath } from "url";
import path from "path";

import vercel from "@astrojs/vercel/serverless";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind()],
  output: "server",

  vite: {
    build: {
      target: "esnext",
    },
    optimizeDeps: {
      exclude: ["@connect-four/connect-four-rust"],
    },
    assetsInclude: ["**/*.wasm"],
    server: {
      fs: {
        allow: [path.resolve(__dirname, "..")],
      },
    },
    resolve: {
      alias: {
        "@connect-four/connect-four-rust": path.resolve(
          __dirname,
          "../packages/connect_four_rust"
        ),
      },
    },
    plugins: [
      {
        name: "wasm-loader",
        load(id) {
          if (id.endsWith(".wasm")) {
            return `export default '${id}'`;
          }
        },
      },
    ],
  },

  adapter: vercel(),
});