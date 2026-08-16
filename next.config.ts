import type { NextConfig } from "next";

const publicSupabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
const publicSupabaseKey =
  process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ??
  process.env["SUPABASE_PUBLISHABLE_KEY"];

const nextConfig: NextConfig = {
  env: Object.fromEntries(
    Object.entries({
      NEXT_PUBLIC_SUPABASE_URL: publicSupabaseUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicSupabaseKey,
    }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  ),
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
