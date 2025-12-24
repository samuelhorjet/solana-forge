import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'gateway.pinata.cloud',
            },
            {
                protocol: 'https',
                hostname: 'ipfs.io',
            },
            {
                protocol: 'https',
                hostname: 'raw.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: '*', 
            }
        ],
    },
};

export default nextConfig;