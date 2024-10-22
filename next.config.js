/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... other configurations ...

  experimental: {
    turbo: {
      rules: {
        // Enable WebAssembly
        "*.wasm": ["webassembly"],
      },
      resolveAlias: {
        // Ensure WASM files are resolved correctly
        "@connect-four/wasm":
          "@connect-four/wasm/wasm-build/connect_four_wasm.js",
      },
    },
  },

  webpack: (config, { isServer }) => {
    // Add WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Add rule for .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });

    // Optionally, for better performance in production:
    if (!isServer) {
      config.optimization.splitChunks.chunks = "all";
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        wasm: {
          test: /\.wasm$/,
          type: "javascript/auto",
          enforce: true,
        },
      };
    }

    return config;
  },
};

module.exports = nextConfig;
