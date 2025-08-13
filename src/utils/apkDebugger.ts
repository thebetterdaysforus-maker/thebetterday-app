// APK 환경에서 디버깅을 위한 유틸리티
import { Platform } from 'react-native';

export const logAPKEnvironment = () => {
  console.log('📱 APK 환경 정보:');
  console.log('- Platform:', Platform?.OS || 'unknown');
  console.log('- Global exists:', typeof global !== 'undefined');
  console.log('- Window exists:', typeof window !== 'undefined');
  console.log('- LocalStorage exists:', typeof localStorage !== 'undefined');
  console.log('- Process exists:', typeof process !== 'undefined');
  console.log('- Buffer exists:', typeof Buffer !== 'undefined');
  console.log('- Fetch exists:', typeof fetch !== 'undefined');
  console.log('- AbortController exists:', typeof AbortController !== 'undefined');
  
  // 환경 변수 체크
  try {
    const hasSupabaseUrl = !!(process?.env?.EXPO_PUBLIC_SUPABASE_URL || 
                             (global as any)?.expo?.EXPO_PUBLIC_SUPABASE_URL);
    const hasSupabaseKey = !!(process?.env?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                             (global as any)?.expo?.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    console.log('- Supabase URL:', hasSupabaseUrl ? '설정됨' : '없음');
    console.log('- Supabase Key:', hasSupabaseKey ? '설정됨' : '없음');
  } catch (error) {
    console.log('- 환경 변수 확인 중 오류:', error);
  }
};

export const testNetworkConnectivity = async (): Promise<boolean> => {
  console.log('🌐 네트워크 연결 테스트 시작...');
  
  const testUrls = [
    'https://www.google.com',
    'https://api.github.com',
    'https://httpbin.org/ip'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`- ${url} 테스트 중...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ ${url} 연결 성공`);
        return true;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ ${url} 연결 실패:`, errorMessage);
    }
  }
  
  console.log('❌ 모든 네트워크 테스트 실패');
  return false;
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