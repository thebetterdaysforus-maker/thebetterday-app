import { supabase } from '../supabaseClient';

// Supabase 연결 상태 확인 함수
export const checkSupabaseConnection = async (): Promise<{
  isConnected: boolean;
  canAuth: boolean;
  canRead: boolean;
  error?: string;
}> => {
  try {
    console.log('🔍 Supabase 연결 상태 확인 시작...');
    
    // 1. 기본 연결 테스트
    const { data: healthData, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (healthError) {
      console.log('❌ Supabase 기본 연결 실패:', healthError.message);
      return {
        isConnected: false,
        canAuth: false,
        canRead: false,
        error: healthError.message
      };
    }
    
    console.log('✅ Supabase 기본 연결 성공');
    
    // 2. 인증 시스템 테스트
    let canAuth = false;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      canAuth = true;
      console.log('✅ Supabase 인증 시스템 정상');
    } catch (authError) {
      console.log('⚠️ Supabase 인증 시스템 오류:', authError);
    }
    
    // 3. 데이터 읽기 테스트
    let canRead = false;
    try {
      const { data: readData, error: readError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (!readError) {
        canRead = true;
        console.log('✅ Supabase 데이터 읽기 정상');
      }
    } catch (readError) {
      console.log('⚠️ Supabase 데이터 읽기 오류:', readError);
    }
    
    return {
      isConnected: true,
      canAuth,
      canRead,
    };
    
  } catch (error) {
    console.error('❌ Supabase 연결 확인 중 오류:', error);
    return {
      isConnected: false,
      canAuth: false,
      canRead: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
};

// APK 환경에서 안전한 Supabase 쿼리 래퍼
export const safeSupabaseQuery = async <T>(
  queryFn: () => Promise<{ data: T; error: any }>,
  fallbackData?: T
): Promise<{ data: T | null; error: any }> => {
  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    console.log('🛡️ Supabase 쿼리 오류 (안전 처리):', error);
    return {
      data: fallbackData || null,
      error: error instanceof Error ? error : new Error('네트워크 오류')
    };
  }
};

// 연결 상태 모니터링
export const startSupabaseMonitoring = () => {
  let isMonitoring = false;
  
  return {
    start: () => {
      if (isMonitoring) return;
      isMonitoring = true;
      
      console.log('🔍 Supabase 연결 모니터링 시작');
      
      // 30초마다 연결 상태 확인
      const interval = setInterval(async () => {
        if (!isMonitoring) {
          clearInterval(interval);
          return;
        }
        
        try {
          const health = await checkSupabaseConnection();
          if (!health.isConnected) {
            console.log('⚠️ Supabase 연결 끊어짐 감지');
          }
        } catch (error) {
          console.log('🔍 연결 모니터링 중 오류:', error);
        }
      }, 30000);
    },
    
    stop: () => {
      isMonitoring = false;
      console.log('🔍 Supabase 연결 모니터링 중지');
    }
  };
};