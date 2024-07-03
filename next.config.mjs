import webpack from 'webpack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        crypto: 'crypto-browserify',
        stream: 'streamBrowserify',
        buffer: 'buffer',
        process: 'process/browser',
      };
      
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser'
        })
      );
    }

    return config;
  },
};

export default nextConfig;