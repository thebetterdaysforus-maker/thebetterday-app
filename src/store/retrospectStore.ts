import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { getTodayKorea } from '../utils/timeUtils';

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
    // 한국 시간 기준으로 오늘 날짜 계산
    const today = getTodayKorea();
    console.log('🔍 회고 조회 시작:', { today });
    const retrospect = await get().fetchOne(today);
    console.log('🔍 회고 조회 결과:', { retrospect, exists: !!retrospect });
    set({ todayRetrospectExists: !!retrospect });
  },

  fetchOne: async (date: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('🔍 회고 조회 실패: 세션 없음');
      return null;
    }

    console.log('🔍 회고 조회 요청:', { date, user_id: session.user.id });

    const { data, error } = await supabase
      .from('retrospects')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('🔍 회고 조회 결과: 데이터 없음');
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
    // 한국 시간 기준으로 오늘 날짜 계산
    const today = getTodayKorea();
    await get()._upsert(today, text);
    set({ todayRetrospectExists: true });
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