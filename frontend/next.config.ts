import type { NextConfig } from "next";

// DEV_ALLOWED_ORIGINS is a comma-separated list of full origins (e.g.
// "http://localhost:3000,https://tuf3000.dureshtech.com") — allowedDevOrigins
// wants bare hostnames, so the scheme is stripped off each entry here.
const allowedDevOrigins = (process.env.DEV_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => origin.replace(/^https?:\/\//, ""));

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
