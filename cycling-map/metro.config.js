const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

const WEBCRYPTO_SHIM = path.resolve(__dirname, 'src/crdt/webcryptoShim.js')

const { resolveRequest } = config.resolver

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'isomorphic-webcrypto/src/react-native') {
    return { type: 'sourceFile', filePath: WEBCRYPTO_SHIM }
  }
  return resolveRequest
    ? resolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

module.exports = config
