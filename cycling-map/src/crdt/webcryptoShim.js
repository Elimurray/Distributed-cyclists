// lib0 (a yjs dependency) hard-requires 'isomorphic-webcrypto/src/react-native' for its
// React Native random-number source. We don't need full WebCrypto (yjs only calls
// getRandomValues for CRDT client IDs, not for anything security-sensitive), so this
// shim satisfies that require by delegating to global.crypto.getRandomValues, which
// src/crdt/polyfills.ts sets up (via expo-crypto) before yjs ever loads. See
// metro.config.js for the alias that redirects this import here.
module.exports = {
  default: {
    ensureSecure: () => {},
    getRandomValues: arr => global.crypto.getRandomValues(arr),
    subtle: undefined,
  },
}
