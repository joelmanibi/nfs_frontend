/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  /**
   * Proxy /api/* → backend interne (HTTP, non exposé au browser).
   * Le browser n'appelle que https://securetransport.paa.ci/api/...
   * → plus de Mixed Content, plus de CORS.
   *
   * API_URL  : variable serveur (non publique), définie dans .env du serveur Next.js
   *            Défaut : http://10.112.30.143:8000/api
   */
  async rewrites() {
    const backendBase =
      process.env.API_URL || '/api';

    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;

