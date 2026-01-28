/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Enable polling for file changes when running in Docker on Windows */
  webpackDevMiddleware: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ["pdfkit"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = config.externals || [];
      config.externals = Array.isArray(externals) ? [...externals, "pdfkit"] : externals;
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "192.168.0.25",
        port: "4649",
        pathname: "/resource/**",
      },
    ],
  },
};

export default nextConfig;
