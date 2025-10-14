const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for react-native-maps
config.resolver.assetExts.push('db');

module.exports = config;