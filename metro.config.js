const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support with proper resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Node.js polyfills for React Native - EAS Build 호환 (강화된 폴리필)
config.resolver.alias = {
  'stream': 'readable-stream',
  'http': 'stream-http',
  'https': 'https-browserify',
  'os': 'os-browserify/browser',
  'url': 'url',
  'crypto': 'crypto-browserify',
  'assert': 'assert',
  'buffer': 'buffer',
  'process': 'process/browser',
  // Supabase node-fetch 호환성을 위한 추가 폴리필
  'util': 'util',
  'querystring': 'querystring-es3',
  'path': 'path-browserify',
  'fs': false,
  'net': false,
  'tls': false,
  // @supabase/node-fetch stream 오류 강제 해결
  '@supabase/node-fetch': '@supabase/supabase-js/dist/main/lib/fetch',
};

// 패키지 exports 사용 중지 - Metro 0.82+ 호환성 문제 해결
config.resolver.unstable_enablePackageExports = false;

// Optimize bundle loading
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 개발 환경에서 불필요한 파일 제외 (정리된 구조 반영)
config.resolver.blockList = [
  /attached_assets\/.*/,
  /private_docs\/.*/,
  /docs\/.*/,
  /landingpage\/.*/,
  /\.cache\/.*/,
  /node_modules\/.*\/test\/.*/,
  /node_modules\/.*\/tests\/.*/,
  /node_modules\/.*\/\.md$/,
  /node_modules\/.*\/\.cache\/.*/,
  // @supabase/node-fetch 완전 차단
  /node_modules\/@supabase\/node-fetch\/.*/,
];

// 캐시 및 Babel 설정
config.transformer.enableBabelRCLookup = false;
// Babel Runtime은 필수 의존성이므로 활성화
config.transformer.enableBabelRuntime = true;

// 성능 최적화 설정
config.transformer.minifierConfig = {
  keep_fnames: false,
  mangle: {
    keep_fnames: false,
  },
};

// 추가 성능 최적화 설정
config.resolver.sourceExts = ['js', 'jsx', 'ts', 'tsx', 'json'];

// 개발 모드에서만 디버그 도구 로드
if (process.env.NODE_ENV === 'development') {
  config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
} else {
  // 프로덕션에서는 최소한의 필드만 사용
  config.resolver.resolverMainFields = ['react-native', 'main'];
}

// 트리 쉐이킹 최적화
config.transformer.unstable_allowRequireContext = true;

module.exports = config;
