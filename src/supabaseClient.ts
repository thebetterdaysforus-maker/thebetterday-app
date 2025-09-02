import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 안전하고 단순한 환경 변수 처리
const getEnvVar = (key: string): string => {
  // 웹 환경에서는 window.ENV 또는 직접 접근 시도
  if (typeof window !== 'undefined' && (window as any).ENV && (window as any).ENV[key]) {
    return (window as any).ENV[key];
  }
  
  // 1순위: Constants.expoConfig (EAS 빌드)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // 2순위: process.env (개발 환경)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  
  // 3순위: manifest fallback (구버전 호환)
  if ((Constants.manifest as any)?.extra?.[key]) {
    return (Constants.manifest as any).extra[key];
  }
  
  // 4순위: 웹 환경 fallback
  if (typeof window !== 'undefined' && (window as any).location && (window as any).location.hostname) {
    // 웹 환경에서는 기본값 사용하지 않고 빈 문자열 반환
  }
  
  return '';
};

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// 환경변수 검증 및 로깅 (개발 환경에서만)
if (__DEV__) {
  console.log('🔍 Supabase 환경변수 확인:', {
    url: supabaseUrl ? '설정됨' : '없음',
    key: supabaseAnonKey ? '설정됨' : '없음',
    platform: typeof window !== 'undefined' ? 'web' : 'native'
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase 환경변수 누락:', {
    url: supabaseUrl,
    key: supabaseAnonKey ? '***' : 'missing'
  });
  
  if (!supabaseUrl) {
    throw new Error('Supabase URL이 필요합니다');
  }
  if (!supabaseAnonKey) {
    throw new Error('Supabase API Key가 필요합니다');
  }
}

// RN 권장 방식으로 Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // APK 환경에서 네트워크 오류 처리 (10초 + 재시도)
  global: {
    fetch: async (url, options = {}) => {
      const maxRetries = 2; // 최대 2번 재시도 (총 3번 시도)
      const timeout = 10000; // 10초로 단축
      
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          let timeoutId;
          const controller = new AbortController();
          const timeoutSignal = controller.signal;
          
          if (options.signal) {
            // 기존 signal이 있으면 연결
            options.signal.addEventListener('abort', () => controller.abort());
          }
          
          // 수동 타임아웃 구현 (10초로 단축)
          timeoutId = setTimeout(() => {
            controller.abort();
          }, timeout);
          
          const response = await fetch(url, {
            ...options,
            signal: timeoutSignal,
          });
          
          clearTimeout(timeoutId);
          if (__DEV__ && attempt > 1) {
            console.log(`✅ Supabase 연결 성공 (${attempt}번째 시도)`);
          }
          return response;
          
        } catch (error) {
          if (attempt <= maxRetries) {
            if (__DEV__) {
              console.log(`🔄 Supabase 연결 실패 (${attempt}/${maxRetries + 1}) - 재시도 중...`, error);
            }
            // 재시도 전 잠깐 대기 (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            continue;
          } else {
            if (__DEV__) {
              console.log(`❌ Supabase 연결 최종 실패 (${maxRetries + 1}번 시도 모두 실패):`, error);
            }
            throw error;
          }
        }
      }
    },
  },
});

export { supabaseUrl };