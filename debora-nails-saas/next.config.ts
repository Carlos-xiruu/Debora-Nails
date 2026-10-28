/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'swmzrzorhjununfeowdm.supabase.co',
        pathname: '/storage/v1/object/public/servicos/**',
      },
    ],
  },
};

export default nextConfig;
