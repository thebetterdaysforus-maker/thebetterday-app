import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { nanoid } from 'nanoid/non-secure';

export interface DailyResolution {
  id: string;
  user_id: string;
  content: string;
  date: string;
  created_at: string;
  updated_at: string;
  display_name: string;
  like_count: number;
  is_liked_by_current_user: boolean;
}

export type FilterType = 'recent' | 'popular' | 'random';

interface CommunityState {
  resolutions: DailyResolution[];
  myResolution: DailyResolution | null;
  loading: boolean;
  currentFilter: FilterType;
  
  // 내 각오 관련
  fetchMyResolution: () => Promise<void>;
  saveMyResolution: (content: string) => Promise<void>;
  updateMyResolution: (content: string) => Promise<void>;
  deleteMyResolution: () => Promise<void>;
  
  // 커뮤니티 각오 관련
  fetchResolutions: (filter?: FilterType) => Promise<void>;
  toggleLike: (resolutionId: string) => Promise<void>;
  setFilter: (filter: FilterType) => void;
  
  // 실시간 업데이트
  refreshResolutions: () => Promise<void>;
  
  // 데이터 초기화
  clearAllResolutions?: () => void;
}

const getTodayString = () => {
  // 한국 시간 기준으로 오늘 날짜 반환 (Intl API 사용)
  const now = new Date();
  const koreaTimeString = now.toLocaleString("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return koreaTimeString;
};

const getYesterdayString = () => {
  // 한국 시간 기준으로 어제 날짜 반환 (커뮤니티에서 표시할 다짐들)
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const koreaTimeString = yesterday.toLocaleString("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return koreaTimeString;
};

const getTomorrowString = () => {
  // 한국 시간 기준으로 내일 날짜 반환 (Date value out of bounds 오류 방지)
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const koreaTimeString = tomorrow.toLocaleString("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  if (__DEV__) {
    console.log('🔍 getTomorrowString 계산:', { 
      utcNow: now.toISOString(), 
      tomorrow: koreaTimeString 
    });
  }
  return koreaTimeString;
};

const useCommunityStore = create<CommunityState>((set, get) => ({
  resolutions: [],
  myResolution: null,
  loading: false,
  currentFilter: 'recent',

  fetchMyResolution: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tomorrow = getTomorrowString(); // 내일 날짜 기준으로 조회
      
      if (session) {
        // 정식 회원 - Supabase에서 조회
        const { data, error } = await supabase
          .from('daily_resolutions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('date', tomorrow)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('내 각오 조회 오류:', error);
          return;
        }

        set({ myResolution: data || null });
      } else {
        // 게스트 모드도 Supabase 사용 - 게스트용 임시 데이터는 표시하지 않음
        set({ myResolution: null });
      }
    } catch (error) {
      console.error('내 각오 조회 실패:', error);
    }
  },

  saveMyResolution: async (content: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tomorrow = getTomorrowString(); // 내일 날짜로 저장
      
      // 로그인 사용자든 게스트든 모두 Supabase 사용
      const userId = session?.user?.id || `guest_${nanoid()}`;
      
      const { data, error } = await supabase
        .from('daily_resolutions')
        .insert([{
          user_id: userId,
          content,
          date: tomorrow,
        }])
        .select()
        .single();

      if (error) {
        console.error('🚫 Supabase 각오 저장 오류 (상세):', {
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint,
          targetDate: tomorrow,
          userId: userId,
          isGuest: !session,
          content: content?.substring(0, 50) + '...'
        });
        
        if (error.code === '23505') {
          // 중복 오류 시 기존 데이터 조회해서 수정 모드로 전환
          const { data: existingData } = await supabase
            .from('daily_resolutions')
            .select('*')
            .eq('user_id', userId)
            .eq('date', tomorrow)
            .single();
          
          if (existingData) {
            set({ myResolution: existingData });
            throw new Error('내일의 각오를 이미 작성하셨습니다.\n수정을 원하시면 편집 버튼을 눌러주세요.');
          }
        }
        
        // RLS 정책 오류 처리
        if (error.code === '42501' || error.message?.includes('RLS')) {
          throw new Error('데이터베이스 권한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        
        throw new Error(`저장 실패: ${error.message || '알 수 없는 오류'}`);
      }

      set({ myResolution: data });
      
      // 로그인 사용자만 커뮤니티 목록 새로고침 (게스트는 건너뜀)
      if (session) {
        await get().refreshResolutions();
      }
    } catch (error) {
      console.error('🚫 각오 저장 실패:', error);
      
      // 안전한 에러 메시지 추출
      let errorMessage = '알 수 없는 오류';
      if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (typeof error.toString === 'function') {
          errorMessage = error.toString();
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      throw new Error(`각오 저장 중 오류가 발생했습니다: ${errorMessage}`);
    }
  },

  updateMyResolution: async (content: string) => {
    try {
      const { myResolution } = get();
      if (!myResolution) throw new Error('수정할 각오가 없습니다');

      // 모든 각오 수정은 Supabase에서 처리
      const { data, error } = await supabase
        .from('daily_resolutions')
        .update({ 
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', myResolution.id)
        .select()
        .single();

      if (error) throw error;

      set({ myResolution: data });
      
      // 로그인 사용자만 커뮤니티 목록 새로고침 (게스트는 건너뜀)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await get().refreshResolutions();
      }
    } catch (error) {
      console.error('각오 수정 실패:', error);
      throw error;
    }
  },

  deleteMyResolution: async () => {
    try {
      const { myResolution } = get();
      if (!myResolution) throw new Error('삭제할 각오가 없습니다');

      // 모든 각오 삭제는 Supabase에서 처리
      const { error } = await supabase
        .from('daily_resolutions')
        .delete()
        .eq('id', myResolution.id);

      if (error) throw error;

      set({ myResolution: null });
      
      // 로그인 사용자만 커뮤니티 목록 새로고침 (게스트는 건너뜀)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await get().refreshResolutions();
      }
    } catch (error) {
      console.error('각오 삭제 실패:', error);
      throw error;
    }
  },

  fetchResolutions: async (filter: FilterType = 'recent') => {
    try {
      set({ loading: true, currentFilter: filter });

      // 게스트 사용자는 데이터베이스 조회 없이 빈 배열 반환
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        set({ resolutions: [], loading: false });
        return;
      }

      let query = supabase
        .from('resolutions_with_likes')
        .select('*')
        .eq('date', getYesterdayString()) // 어제 작성한 다짐들을 오늘 표시
        .not('user_id', 'eq', session.user.id); // 자신의 각오는 제외 (이미 내 각오로 따로 표시)

      switch (filter) {
        case 'popular':
          query = query.order('like_count', { ascending: false });
          break;
        case 'recent':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('각오 목록 조회 오류:', error);
        return;
      }

      let resolutions = data || [];

      // 랜덤 필터의 경우 클라이언트에서 셔플
      if (filter === 'random') {
        resolutions = [...resolutions].sort(() => Math.random() - 0.5);
      }

      set({ resolutions, loading: false });
    } catch (error) {
      console.error('각오 목록 조회 실패:', error);
      set({ loading: false });
    }
  },

  toggleLike: async (resolutionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('게스트 사용자는 좋아요 기능을 사용할 수 없습니다');
        return;
      }

      const { resolutions } = get();
      const resolution = resolutions.find(r => r.id === resolutionId);
      if (!resolution) return;

      if (resolution.is_liked_by_current_user) {
        // 좋아요 취소
        const { error } = await supabase
          .from('resolution_likes')
          .delete()
          .eq('user_id', session.user.id)
          .eq('resolution_id', resolutionId);

        if (error) throw error;
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('resolution_likes')
          .insert([{
            user_id: session.user.id,
            resolution_id: resolutionId,
          }]);

        if (error) throw error;
      }

      // 로컬 상태 업데이트
      const updatedResolutions = resolutions.map(r => {
        if (r.id === resolutionId) {
          return {
            ...r,
            is_liked_by_current_user: !r.is_liked_by_current_user,
            like_count: r.is_liked_by_current_user ? r.like_count - 1 : r.like_count + 1
          };
        }
        return r;
      });

      // 내 각오도 업데이트 (만약 좋아요 한 게 내 각오라면)
      const { myResolution } = get();
      if (myResolution && myResolution.id === resolutionId) {
        const updatedMyResolution = {
          ...myResolution,
          is_liked_by_current_user: !myResolution.is_liked_by_current_user,
          like_count: myResolution.is_liked_by_current_user ? myResolution.like_count - 1 : myResolution.like_count + 1
        };
        set({ resolutions: updatedResolutions, myResolution: updatedMyResolution });
      } else {
        set({ resolutions: updatedResolutions });
      }
    } catch (error) {
      console.error('좋아요 토글 실패:', error);
      throw error;
    }
  },

  setFilter: (filter: FilterType) => {
    set({ currentFilter: filter });
  },

  refreshResolutions: async () => {
    try {
      // 게스트 사용자는 커뮤니티 데이터 새로고침 불가
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('게스트 사용자는 커뮤니티 새로고침을 할 수 없습니다');
        return;
      }
      
      const { currentFilter } = get();
      await get().fetchResolutions(currentFilter);
    } catch (error) {
      console.error('커뮤니티 새로고침 실패:', error);
    }
  },

  // 데이터 초기화 함수
  clearAllResolutions: async () => {
    console.log("🧹 모든 각오 데이터 로컬 스토어 초기화");
    
    set({ 
      resolutions: [],
      myResolution: null,
      currentFilter: 'recent'
    });
  },
}));

export default useCommunityStore;
