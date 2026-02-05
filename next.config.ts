import type { NextConfig } from "next";

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

const extraDevOrigins =
  process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "http://scorecard.clients.scripps.org",
    "https://scorecard.clients.scripps.org",
    ...defaultDevOrigins,
    ...extraDevOrigins,
  ],
};

export default nextConfig;
