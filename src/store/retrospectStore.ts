import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { getTodayKorea } from '../utils/timeUtils';
import { syncOnUserAction } from '../utils/smartSyncManager';

export interface Retrospect {
  user_id: string;
  date: string;     // YYYY-MM-DD
  text: string;
  created_at: string;
  updated_at: string;
}

interface RetrospectState {
  records: Record<string, Retrospect>;        // 캐시 (date → row)
  todayRetrospectExists: boolean;             // 홈화면 버튼 제어

  fetchToday: () => Promise<void>;
  fetchOne: (date: string) => Promise<Retrospect | null>;
  saveRetrospect: (text: string) => Promise<void>;  // 오늘 저장
  /** 내부: 범용 upsert (다른 날짜에도 재사용 가능) */
  _upsert: (date: string, text: string) => Promise<void>;
  
  // 데이터 초기화
  clearAllRetrospects?: () => void;
}

const useRetrospectStore = create<RetrospectState>((set, get) => ({
  records: {},
  todayRetrospectExists: false,

  fetchToday: async () => {
    // 🔥 timeUtils와 통일된 한국시간 계산
    const { getTodayKorea } = await import('../utils/timeUtils');
    const today = getTodayKorea();
    
    if (__DEV__) console.log('🔍 회고 조회 (timeUtils 통일):', { 
      today,
      현재한국시간: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    });
    
    const retrospect = await get().fetchOne(today);
    set({ todayRetrospectExists: !!retrospect });
  },

  fetchOne: async (date: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      if (__DEV__) console.log('🔍 회고 조회 실패: 세션 없음');
      return null;
    }

    if (__DEV__) console.log('🔍 회고 조회 요청:', { date });

    const { data, error } = await supabase
      .from('retrospects')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        if (__DEV__) console.log('🔍 회고 조회 결과: 데이터 없음');
        return null;
      }
      console.error('🔍 회고 조회 오류:', error);
      return null;
    }

    console.log('🔍 회고 조회 성공:', data);

    set(state => ({
      records: { ...state.records, [date]: data }
    }));

    return data;
  },

  saveRetrospect: async (text: string) => {
    try {
      // 🔥 timeUtils와 통일된 한국시간 계산
      const { getTodayKorea } = await import('../utils/timeUtils');
      const today = getTodayKorea();
      
      console.log('💾 회고 저장 시작 (timeUtils 통일):', { 
        today,
        text: text.slice(0, 50) + '...'
      });
      
      await get()._upsert(today, text);
      console.log('✅ _upsert 완료');
      
      set({ todayRetrospectExists: true });
      console.log('✅ todayRetrospectExists = true 설정 완료');
      
      // 🔕 알림 시스템 비활성화됨 - 회고 알림 취소 스킵
      console.log('🔕 알림 시스템 비활성화됨 - 회고 알림 관리 스킵');
      
      // 스마트 동기화 - 회고 생성/수정 시 즉시 동기화
      await syncOnUserAction('retrospect_create', { date: today, textLength: text.length });
      console.log('✅ 스마트 동기화 완료');
      
      console.log('🎉 회고 저장 전체 과정 완료!');
    } catch (error) {
      console.error('❌ 회고 저장 중 오류 발생:', error);
      throw error;
    }
  },

  _upsert: async (date: string, text: string) => {
    console.log('💾 _upsert 시작:', { date, textLength: text.length });
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ _upsert 실패: 세션 없음');
      throw new Error('Not authenticated');
    }
    
    console.log('✅ 세션 확인 완료');

    const retrospect: Retrospect = {
      user_id: session.user.id,
      date,
      text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('💾 Supabase upsert 호출 시작');
    const { error } = await supabase
      .from('retrospects')
      .upsert([retrospect]);

    if (error) {
      console.error('❌ Supabase upsert 실패:', error);
      throw error;
    }
    
    console.log('✅ Supabase upsert 성공');

    set(state => ({
      records: { ...state.records, [date]: retrospect }
    }));
    
    console.log('✅ 로컬 스토어 업데이트 완료');
  },

  // 데이터 초기화 함수
  clearAllRetrospects: () => {
    console.log("🧹 모든 회고 데이터 로컬 스토어 초기화");
    set({ 
      records: {},
      todayRetrospectExists: false
    });
  },
}));

export default useRetrospectStore;