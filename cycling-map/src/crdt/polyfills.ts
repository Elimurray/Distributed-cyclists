// yjs's dependencies (lib0) assume either a full Node.js or a full browser environment.
// React Native has neither, so these polyfills must run before anything imports
// yjs/y-websocket — this file must stay the very first import in index.ts.
import { Buffer } from 'buffer'
import * as Crypto from 'expo-crypto'

// lib0/webcrypto needs crypto.getRandomValues (uuid needs it too). See metro.config.js's
// alias to webcryptoShim.js, which reads this global.
if (typeof global.crypto !== 'object') {
  // @ts-expect-error React Native has no global crypto object by default
  global.crypto = {}
}
// expo-crypto's getRandomValues is typed narrower than the standard ArrayBufferView
// signature lib.dom expects, but it's functionally the same Web Crypto contract.
// @ts-expect-error
global.crypto.getRandomValues = Crypto.getRandomValues

// lib0/buffer falls back to Node's Buffer-based base64 encoding whenever `window`/
// `document` are absent, which is always true in React Native.
if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer
}
