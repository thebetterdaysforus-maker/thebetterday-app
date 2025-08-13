// APK 환경에서 디버깅을 위한 유틸리티
import { Platform } from 'react-native';

export const logAPKEnvironment = () => {
  // 개발 환경에서만 상세 로깅
  if (!__DEV__) {
    return;
  }
  
  console.log('📱 APK 환경 정보:');
  console.log('- Platform:', Platform?.OS || 'unknown');
  console.log('- 기본 API 지원:', {
    fetch: typeof fetch !== 'undefined',
    localStorage: typeof localStorage !== 'undefined',
    AbortController: typeof AbortController !== 'undefined'
  });
  
  // 환경 변수 체크 (민감 정보 제외)
  try {
    const hasSupabaseUrl = !!(process?.env?.EXPO_PUBLIC_SUPABASE_URL);
    const hasSupabaseKey = !!(process?.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    console.log('- 환경변수:', {
      supabaseUrl: hasSupabaseUrl ? '설정됨' : '없음',
      supabaseKey: hasSupabaseKey ? '설정됨' : '없음'
    });
  } catch (error) {
    console.log('- 환경 변수 확인 불가');
  }
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
  // APK 실행 중 발생하는 오류들을 수집하고 분석
  errors: [] as Array<{ timestamp: Date; error: any; context: string }>,
  
  report: (error: any, context: string = 'unknown') => {
    const errorLog = {
      timestamp: new Date(),
      error: {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        name: error?.name || 'Error'
      },
      context
    };
    
    APKErrorReporter.errors.push(errorLog);
    console.log(`🚨 APK Error [${context}]:`, errorLog.error.message);
    
    // 최근 10개 오류만 유지
    if (APKErrorReporter.errors.length > 10) {
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