const internalApiTarget =
  process.env.INTERNAL_API_TARGET ||
  (process.env.NODE_ENV === "production"
    ? "http://ecg-api-service.ecg-mlops.svc.cluster.local:8000"
    : "http://localhost:8000");

/** @type {import("next").NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${internalApiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
