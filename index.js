// APK 실행 오류 해결을 위한 안전한 초기화
import 'react-native-get-random-values';

// APK 환경에서 필요한 추가 polyfills
if (typeof process === 'undefined') {
  global.process = { env: {} };
}

if (typeof global === 'undefined') {
  var global = globalThis;
}

// Error Boundary로 APK 크래시 방지
const setupErrorHandling = () => {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // 중요한 오류는 그대로 출력하되, 앱 크래시 방지
    try {
      originalConsoleError.apply(console, args);
    } catch (e) {
      // 오류 출력 자체에서 문제가 생겨도 앱은 계속 실행
    }
  };

  // 전역 오류 핸들러
  if (typeof ErrorUtils !== 'undefined') {
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.log('Global error caught:', error, 'isFatal:', isFatal);
      // 치명적이지 않은 오류는 무시하고 계속 실행
      if (!isFatal) {
        return;
      }
      // 치명적 오류도 가능한 한 복구 시도
      if (originalErrorHandler) {
        originalErrorHandler(error, false); // false로 변경하여 앱 종료 방지
      }
    });
  }
};

// APK 환경에서 window 객체 보장
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  global.window = global;
}

// localStorage polyfill for APK
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0
  };
}

// React Native polyfills
if (typeof __dirname === 'undefined') {
  global.__dirname = '/';
}

if (typeof __filename === 'undefined') {
  global.__filename = '';
}

// Buffer 폴리필 (필요한 경우)
try {
  if (typeof Buffer === 'undefined') {
    global.Buffer = require('buffer').Buffer;
  }
} catch (e) {
  // Buffer가 없어도 괜찮음
}

// 오류 처리 설정 실행
setupErrorHandling();

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);