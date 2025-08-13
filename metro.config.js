const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable web support with proper resolution
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// RN/브라우저 조건을 확실히 매칭 (SDK 53 Package Exports 대응)
config.resolver.unstable_conditionNames = ['react-native', 'browser', 'import', 'require', 'default'];

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
  // @supabase/node-fetch 완전 차단 및 교체
  '@supabase/node-fetch': require.resolve('cross-fetch'),
  'node-fetch': require.resolve('cross-fetch'),
  'stream': require.resolve('stream-browserify'),
};

// Package Exports 활성화 (SDK 53 기본값) - 조건 우선순위로 제어
config.resolver.unstable_enablePackageExports = true;

// Optimize bundle loading
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// 커스텀 resolveRequest로 특정 모듈을 대체 (더 강력한 차단)
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // @supabase/node-fetch 모든 변형 차단
  if (moduleName.includes('@supabase/node-fetch') || 
      moduleName.includes('node-fetch') ||
      moduleName.includes('supabase') && moduleName.includes('fetch')) {
    return context.resolveRequest(context, 'cross-fetch', platform);
  }
  // ws 모듈 차단
  if (moduleName === 'ws' || moduleName.includes('/ws/') || moduleName.includes('\\ws\\')) {
    return {
      type: 'empty',
    };
  }
  // stream 모듈을 직접 요청하는 경우도 차단
  if (moduleName === 'stream') {
    return context.resolveRequest(context, 'readable-stream', platform);
  }
  
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

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
  // @supabase/node-fetch 완전 차단 - 더 강력한 패턴
  /node_modules\/@supabase\/node-fetch/,
  /node_modules.*@supabase.*node-fetch/,
  /@supabase\/node-fetch/,
  /supabase.*node-fetch/,
  // ws 모듈도 차단 (realtime 경유 stream 오류 방지)
  /node_modules\/ws/,
  /node_modules.*\/ws/,
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
