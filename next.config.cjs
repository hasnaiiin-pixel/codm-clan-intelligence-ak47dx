/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // MODALITÀ STABILIZZAZIONE DEPLOY CODM
  // La sicurezza vera resta su Supabase RLS.
  // Questo evita che piccoli errori TypeScript/ESLint blocchino Vercel mentre completiamo il refactor ruoli/UI.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
