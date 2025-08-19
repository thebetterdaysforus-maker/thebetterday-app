// APK 환경에서 디버깅을 위한 유틸리티
import { Platform } from 'react-native';

export const logAPKEnvironment = () => {
  if (!__DEV__) return;
  
  console.log('📱 APK 환경 정보:', {
    platform: Platform?.OS || 'unknown',
    apis: {
      fetch: typeof fetch !== 'undefined',
      AbortController: typeof AbortController !== 'undefined'
    }
  });
};

export const testNetworkConnectivity = async (): Promise<boolean> => {
  if (!__DEV__) {
    // 프로덕션에서는 간단한 연결 테스트만
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('data:text/plain,test', {
        signal: controller.signal
      });
      return response.ok;
    } catch {
      return false;
    }
  }
  
  // 개발 환경에서만 상세한 테스트
  console.log('🌐 네트워크 연결 테스트 시작...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    // 기본 연결성만 테스트 (외부 서비스 의존성 제거)
    const response = await fetch('data:text/plain,connectivity-test', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    const isConnected = response.ok;
    
    console.log(isConnected ? '✅ 네트워크 연결 가능' : '❌ 네트워크 연결 실패');
    return isConnected;
  } catch (error) {
    console.log('❌ 네트워크 테스트 실패');
    return false;
  }
};

export const APKErrorReporter = {
  errors: [] as Array<{ timestamp: Date; error: any; context: string }>,
  
  report: (error: any, context: string = 'unknown') => {
    if (!__DEV__) return;
    
    const errorLog = {
      timestamp: new Date(),
      error: { message: error?.message || 'Unknown error', name: error?.name || 'Error' },
      context
    };
    
    APKErrorReporter.errors.push(errorLog);
    console.log(`🚨 APK Error [${context}]:`, errorLog.error.message);
    
    // 최근 5개 오류만 유지 (메모리 최적화)
    if (APKErrorReporter.errors.length > 5) {
      APKErrorReporter.errors.shift();
    }
  },
  
  getSummary: () => {
    const errorCounts = APKErrorReporter.errors.reduce((acc, log) => {
      const key = `${log.context}: ${log.error.message}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('📊 APK 오류 요약:', errorCounts);
    return errorCounts;
  },
  
  clear: () => {
    APKErrorReporter.errors = [];
    console.log('🧹 APK 오류 로그 정리됨');
  }
};

// APK 환경에서 안전한 AsyncStorage 래퍼
export const safeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      APKErrorReporter.report(error, 'AsyncStorage.getItem');
      return null;
    }
  },
  
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      APKErrorReporter.report(error, 'AsyncStorage.setItem');
    }
  },
  
  removeItem: async (key: string): Promise<void> => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      APKErrorReporter.report(error, 'AsyncStorage.removeItem');
    }
  }
};
