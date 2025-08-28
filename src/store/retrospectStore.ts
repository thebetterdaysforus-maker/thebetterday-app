import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { getTodayKorea } from '../utils/timeUtils';
import { syncOnUserAction } from '../utils/smartSyncManager';
import { cancelRetrospectReminder } from '../utils/notificationScheduler';

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
    // 🔥 APK 안전한 한국 시간 회고 조회
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const koreaTime = new Date(utc + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    if (__DEV__) console.log('🔍 회고 조회 (APK 한국시간):', { 
      today,
      koreaTime: koreaTime.toLocaleString('ko-KR')
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
    // 🔥 APK 안전한 한국 시간 회고 저장
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const koreaTime = new Date(utc + (9 * 60 * 60 * 1000));
    const today = koreaTime.toISOString().slice(0, 10);
    
    console.log('💾 회고 저장 (APK 한국시간):', { 
      today,
      text: text.slice(0, 50) + '...'
    });
    
    await get()._upsert(today, text);
    set({ todayRetrospectExists: true });
    
    // 회고록 작성 완료 시 회고 알림 취소
    await cancelRetrospectReminder();
    console.log('📝 회고록 작성 완료 - 회고 알림 취소됨');
    
    // 스마트 동기화 - 회고 생성/수정 시 즉시 동기화
    await syncOnUserAction('retrospect_create', { date: today, textLength: text.length });
  },

  _upsert: async (date: string, text: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const retrospect: Retrospect = {
      user_id: session.user.id,
      date,
      text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('retrospects')
      .upsert([retrospect]);

    if (error) throw error;

    set(state => ({
      records: { ...state.records, [date]: retrospect }
    }));
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