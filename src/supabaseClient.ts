import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// 안전하고 단순한 환경 변수 처리
const getEnvVar = (key: string): string => {
  // 1순위: Constants.expoConfig (EAS 빌드)
  if (Constants.expoConfig?.extra?.[key]) {
    return Constants.expoConfig.extra[key];
  }
  
  // 2순위: process.env (개발 환경)
  if (process.env[key]) {
    return process.env[key];
  }
  
  // 3순위: manifest fallback (구버전 호환)
  if ((Constants.manifest as any)?.extra?.[key]) {
    return (Constants.manifest as any).extra[key];
  }
  
  return '';
};

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

// 환경변수 검증 (프로덕션에서는 간소화된 로깅)
if (!supabaseUrl || !supabaseAnonKey) {
  const isDev = __DEV__ || process.env.NODE_ENV === 'development';
  
  if (isDev) {
    console.warn('⚠️ Supabase 환경변수 확인 필요');
    console.warn('URL:', supabaseUrl ? '설정됨' : '없음');
    console.warn('Key:', supabaseAnonKey ? '설정됨' : '없음');
  }
  
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
  // APK 환경에서 네트워크 오류 처리
  global: {
    fetch: async (url, options = {}) => {
      try {
        // 기본 fetch 시도
        // APK 환경에서 AbortSignal.timeout이 없을 수 있음
        let timeoutId;
        const controller = new AbortController();
        const timeoutSignal = controller.signal;
        
        if (options.signal) {
          // 기존 signal이 있으면 연결
          options.signal.addEventListener('abort', () => controller.abort());
        }
        
        // 수동 타임아웃 구현
        timeoutId = setTimeout(() => {
          controller.abort();
        }, 10000);
        
        const response = await fetch(url, {
          ...options,
          signal: timeoutSignal,
        });
        
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        if (__DEV__) {
          console.log('🌐 네트워크 요청 실패:', error);
        }
        throw error;
      }
    },
  },
});

export { supabaseUrl };
