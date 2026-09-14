const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prefer main (CommonJS) before module so that isomorphic libraries like @supabase
// resolve cleanly without missing extension issues in Metro bundler on web & mobile
config.resolver.resolverMainFields = ['react-native', 'main', 'module'];

module.exports = config;
