import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.less": {
        as: "*.css",
        loaders: ["less-loader"],
      },
      "*.module.less": {
        as: "*.css",
        loaders: ["less-loader"],
      },
    },
  },
};

export default nextConfig;
