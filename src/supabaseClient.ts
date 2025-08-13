import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// APK 환경에서 안전한 환경 변수 처리
let supabaseUrl: string;
let supabaseAnonKey: string;

try {
  // 다양한 환경에서 환경 변수 가져오기
  supabaseUrl = 
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || 
    (Constants.manifest as any)?.extra?.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    '';
    
  supabaseAnonKey = 
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
    (Constants.manifest as any)?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    '';
} catch (error) {
  console.log('환경 변수 로딩 중 오류 (정상적으로 처리됨):', error);
  supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables - check configuration');
  console.error('supabaseUrl:', supabaseUrl ? '설정됨' : '없음');
  console.error('supabaseAnonKey:', supabaseAnonKey ? '설정됨' : '없음');
  
  // APK 환경에서는 오류 대신 경고만 표시하고 기본값 사용
  if (supabaseUrl && !supabaseAnonKey) {
    console.warn('⚠️ Supabase URL만 설정됨 - 읽기 전용 모드로 동작할 수 있음');
  } else if (!supabaseUrl && supabaseAnonKey) {
    console.warn('⚠️ Supabase Key만 설정됨 - URL 없이 동작 불가');
    throw new Error('Supabase URL이 필요합니다');
  } else {
    console.warn('⚠️ Supabase 환경변수 누락 - 로컬 모드로 동작');
    throw new Error('Supabase 설정이 필요합니다');
  }
}

// APK 환경에서 안전한 Supabase 클라이언트 생성
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // APK 환경에서 세션 저장소 설정
    storage: typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined,
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
        console.log('🌐 네트워크 요청 실패:', error);
        throw error;
      }
    },
  },
});

export { supabaseUrl };