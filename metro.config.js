// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');
config.resolver.assetExts.push('lottie');

// Add platform-specific extensions for web
config.resolver.platforms = ['ios', 'android', 'web'];

// Resolve react-native-maps to empty module on web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    // Return an empty module for web
    return {
      type: 'empty',
    };
  }
  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;