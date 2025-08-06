const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support with proper resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.alias = {
  'react-native': 'react-native-web',
};

// Optimize bundle loading
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 성능 최적화 설정
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: {
    keep_fnames: false,
  },
};

// 빠른 새로고침 활성화
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 개발 환경에서 불필요한 파일 제외
config.resolver.blockList = [
  /attached_assets\/.*/,
  /\.md$/,
  /\.txt$/,
  /CHANGELOG/,
  /README/,
];

// 캐시 최적화
config.transformer.enableBabelRCLookup = false;
config.transformer.enableBabelRuntime = false;

module.exports = config;