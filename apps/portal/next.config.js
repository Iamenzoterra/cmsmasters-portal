const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // Next.js bundles a polyfill module (Array.at, Object.hasOwn, etc.) into
      // every client build. Our browserslist targets Baseline 2023, which has
      // all of those natively — swap the module for a minimal shim that only
      // polyfills URL.canParse (the one method not yet in Safari 16).
      // The import inside Next (`import '../build/polyfills/polyfill-module'`)
      // is relative, so alias on package path doesn't match — replace by
      // regex on the resolved disk path instead.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /next[\\/]dist[\\/](esm[\\/])?build[\\/]polyfills[\\/]polyfill-module(\.js)?$/,
          path.resolve(__dirname, './polyfills-shim.js'),
        ),
      )
    }
    return config
  },
}

module.exports = nextConfig
