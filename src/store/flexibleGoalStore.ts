import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import { getTodayString } from '../utils/dateHelpers';
import { getTodayKorea, getTomorrowKorea } from '../utils/timeUtils';

export interface FlexibleGoal {
  id: string;
  user_id: string;
  title: string;
  goal_type: 'daily'; // 단일 타입으로 단순화
  date: string; // YYYY-MM-DD
  status: 'pending' | 'success' | 'failure';
  created_at: string;
  updated_at: string;
}

interface FlexibleGoalState {
  goals: FlexibleGoal[];
  
  // 데이터 관리
  fetchGoals: (date?: string) => Promise<void>;
  addGoal: (title: string, date?: string) => Promise<void>;
  updateGoal: (id: string, updates: Partial<FlexibleGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  checkGoal: (id: string) => Promise<void>;
  
  // 유틸리티
  getGoalsByDate: (date: string) => FlexibleGoal[];
  getTodayGoals: () => FlexibleGoal[];
  getTomorrowGoals: () => FlexibleGoal[];
  getTodayStats: () => {
    total: number;
    success: number;
    failure: number;
    pending: number;
    successRate: number;
  };
  
  // 목표 존재 확인
  hasTodayGoal: (date?: string) => boolean;
  hasTomorrowGoal: () => boolean;
  
  // 데이터 초기화
  clearAllFlexibleGoals?: () => void;
}

export const useFlexibleGoalStore = create<FlexibleGoalState>((set, get) => ({
  goals: [],

  fetchGoals: async (date?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      let query = supabase
        .from('flexible_goals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) throw error;

      const goals: FlexibleGoal[] = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        goal_type: item.goal_type,
        date: item.date,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || [];

      set({ goals });
    } catch (error) {
      if (__DEV__) console.error('유연한 목표 가져오기 오류:', error);
    }
  },

  addGoal: async (title: string, date?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 한국 시간 기준으로 날짜 설정 (tomorrow-first 워크플로우)
    const targetDate = date || getTomorrowKorea();
    
    // 해당 날짜에 이미 목표가 있는지 확인
    const existingGoal = get().goals.find(g => g.date === targetDate);
    if (__DEV__) console.log("🔍 FlexibleGoalStore 중복 검사:", {
      targetDate,
      existingGoal: existingGoal ? { id: existingGoal.id, title: existingGoal.title, date: existingGoal.date } : null,
      현재목표개수: get().goals.length
    });
    
    if (existingGoal) {
      throw new Error('해당 날짜의 목표를 이미 작성했습니다.');
    }
    
    try {
      const { data, error } = await supabase
        .from('flexible_goals')
        .insert([{
          user_id: session.user.id,
          title,
          goal_type: 'daily',
          date: targetDate,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      const newGoal: FlexibleGoal = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        goal_type: data.goal_type,
        date: data.date,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      set(state => ({
        goals: [newGoal, ...state.goals]
      }));

      console.log('✅ 유연한 목표 추가:', newGoal);
    } catch (error) {
      console.error('유연한 목표 추가 오류:', error);
      // 사용자에게 친화적인 오류 메시지 표시
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as any).message;
        if (errorMessage?.includes('relation "flexible_goals" does not exist')) {
          console.error('데이터베이스 테이블이 존재하지 않습니다.');
        } else {
          console.error('목표 추가 중 오류가 발생했습니다.');
        }
      }
      throw error;
    }
  },

  updateGoal: async (id: string, updates: Partial<FlexibleGoal>) => {
    try {
      const { error } = await supabase
        .from('flexible_goals')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        goals: state.goals.map(goal =>
          goal.id === id 
            ? { ...goal, ...updates, updated_at: new Date().toISOString() }
            : goal
        )
      }));

      console.log('✅ 유연한 목표 업데이트:', id, updates);
    } catch (error) {
      console.error('유연한 목표 업데이트 오류:', error);
      throw error;
    }
  },

  deleteGoal: async (id: string) => {
    try {
      const { error } = await supabase
        .from('flexible_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        goals: state.goals.filter(goal => goal.id !== id)
      }));

      console.log('✅ 유연한 목표 삭제:', id);
    } catch (error) {
      console.error('유연한 목표 삭제 오류:', error);
      throw error;
    }
  },

  checkGoal: async (id: string) => {
    try {
      const goal = get().goals.find(g => g.id === id);
      if (!goal) return;

      const newStatus = goal.status === 'success' ? 'pending' : 'success';
      
      await get().updateGoal(id, { status: newStatus });
      console.log('✅ 유연한 목표 체크:', id, '상태:', newStatus);
    } catch (error) {
      console.error('유연한 목표 체크 오류:', error);
    }
  },

  getGoalsByDate: (date: string) => {
    const { goals } = get();
    return goals.filter(goal => goal.date === date);
  },

  // getGoalsByType 함수 제거 (더 이상 필요하지 않음)

  getTodayGoals: () => {
    const { getGoalsByDate } = get();
    return getGoalsByDate(getTodayString());
  },

  getTomorrowGoals: () => {
    const { getGoalsByDate } = get();
    const tomorrowString = getTomorrowKorea();
    return getGoalsByDate(tomorrowString);
  },

  getTodayStats: () => {
    const todayGoals = get().getTodayGoals();
    const total = todayGoals.length;
    const success = todayGoals.filter(g => g.status === 'success').length;
    const failure = todayGoals.filter(g => g.status === 'failure').length;
    const pending = todayGoals.filter(g => g.status === 'pending').length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

    return { total, success, failure, pending, successRate };
  },

  hasTodayGoal: (date?: string) => {
    const targetDate = date || getTodayString();
    const { goals } = get();
    return goals.some(goal => goal.date === targetDate);
  },

  hasTomorrowGoal: () => {
    const tomorrowString = getTomorrowKorea();
    const { goals } = get();
    return goals.some(goal => goal.date === tomorrowString);
  },

  // 데이터 초기화 함수
  clearAllFlexibleGoals: () => {
    console.log("🧹 모든 유연한 목표 데이터 로컬 스토어 초기화");
    set({ goals: [] });
  },
}));