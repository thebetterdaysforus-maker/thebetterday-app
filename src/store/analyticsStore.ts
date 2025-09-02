import { create } from 'zustand';
import { supabase } from '../supabaseClient';
import useUserStore from './userStore';
import { formatDate } from '../utils/timeUtils';

export interface UserStatistics {
  totalGoals: number;
  successGoals: number;
  failureGoals: number;
  successRate: number;
  currentStreak: number;
  bestStreak: number;
  bestHour: number;
  bestDayOfWeek: number;
  daysSinceStart: number;
  retrospectCount: number;
}

export interface HourlyStats {
  hour: number;
  totalGoals: number;
  successGoals: number;
  successRate: number;
}

export interface DailyStats {
  dayOfWeek: number;
  totalGoals: number;
  successGoals: number;
  successRate: number;
}

export interface AdminInsight {
  id: string;
  title: string;
  description: string;
  insightType: 'pattern' | 'tip' | 'stats';
  isActive: boolean;
  displayOrder: number;
}

interface AnalyticsState {
  statistics: UserStatistics | null;
  hourlyStats: HourlyStats[];
  dailyStats: DailyStats[];
  adminInsights: AdminInsight[];
  loading: boolean;
  
  // 데이터 가져오기
  calculateStatistics: () => Promise<void>;
  fetchHourlyStats: () => Promise<void>;
  fetchDailyStats: () => Promise<void>;
  fetchAdminInsights: () => Promise<void>;
  
  // 통계 업데이트
  updateStatistics: () => Promise<void>;
  
  // 유틸리티
  getBestTimeSlot: () => string;
  getBestDay: () => string;
}

const getDayName = (dayOfWeek: number): string => {
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return days[dayOfWeek] || '알 수 없음';
};

const getTimeSlot = (hour: number): string => {
  if (hour >= 6 && hour < 12) return '오전';
  if (hour >= 12 && hour < 18) return '오후';
  if (hour >= 18 && hour < 24) return '저녁';
  return '새벽';
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  statistics: null,
  hourlyStats: [],
  dailyStats: [],
  adminInsights: [],
  loading: false,

  calculateStatistics: async () => {
    if (__DEV__) console.log('🚨🚨🚨 calculateStatistics 함수 실행됨!!!');
    const { session } = useUserStore.getState();
    if (!session) {
      if (__DEV__) console.log('❌ 세션 없음, 계산 중단');
      return;
    }

    if (__DEV__) console.log('✅ 세션 확인됨, 계산 시작');
    set({ loading: true });
    try {
      // 기본 통계 계산 (필요한 컬럼만 선택 - 6개월 과거 데이터)
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id, status, target_time, title')
        .eq('user_id', session.user.id)
        .gte('target_time', new Date(Date.now() - 180 * 86400000).toISOString()) // 6개월 제한
        .lte('target_time', new Date(Date.now() + 1 * 86400000).toISOString()) // 내일까지
        .order('target_time', { ascending: false });

      if (goalsError) throw goalsError;

      // retrospects 테이블이 존재하지 않으므로 기본값 설정
      const retrospects: any[] = [];

      const totalGoals = goals?.length || 0;
      const successGoals = goals?.filter(g => g.status === 'success').length || 0;
      const failureGoals = goals?.filter(g => g.status === 'failure').length || 0;
      const successRate = totalGoals > 0 ? Math.round((successGoals / totalGoals) * 100) : 0;

      // 연속 성공 계산 (수정된 로직)
      const sortedGoals = goals?.sort((a, b) => new Date(b.target_time).getTime() - new Date(a.target_time).getTime()) || [];
      if (__DEV__) console.log('🔍 연속 기록 계산 시작:', {
        totalGoals: goals?.length,
        sortedGoalsCount: sortedGoals.length,
        firstFewGoals: sortedGoals.slice(0, 5).map(g => ({ 
          title: g.title, 
          status: g.status, 
          target_time: g.target_time,
          korean_date: formatDate(new Date(g.target_time))
        })),
        successCount: goals?.filter(g => g.status === 'success').length,
        failureCount: goals?.filter(g => g.status === 'failure').length,
        pendingCount: goals?.filter(g => g.status === 'pending').length
      });
      
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      let isCurrentStreakSet = false;

      // 최신부터 과거로 진행하면서 현재 연속 기록 계산
      for (let i = 0; i < sortedGoals.length; i++) {
        const goal = sortedGoals[i];
        if (goal.status === 'pending') {
          if (__DEV__) console.log(`⏳ [${i}] pending 목표 건너뜀:`, { title: goal.title, date: formatDate(new Date(goal.target_time)) });
          continue; // pending 목표는 제외
        }
        
        console.log(`🔍 [${i}] 목표 처리 중:`, { 
          title: goal.title, 
          status: goal.status, 
          date: formatDate(new Date(goal.target_time)),
          currentStreak: currentStreak,
          tempStreak: tempStreak,
          isCurrentStreakSet: isCurrentStreakSet
        });
        
        if (goal.status === 'success') {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
          
          // 현재 연속 기록은 가장 최근부터 시작하는 연속 성공
          if (!isCurrentStreakSet) {
            currentStreak++;
            console.log(`✅ [${i}] 현재 연속 증가:`, { goal: goal.title, currentStreak, tempStreak });
          } else {
            console.log(`📈 [${i}] 과거 성공 (현재 연속에 미반영):`, { goal: goal.title, tempStreak });
          }
        } else if (goal.status === 'failure') {
          // 실패가 나오면 현재 연속 기록 확정
          if (!isCurrentStreakSet) {
            isCurrentStreakSet = true;
            console.log(`❌ [${i}] 현재 연속 확정:`, { goal: goal.title, finalCurrentStreak: currentStreak });
          } else {
            console.log(`💥 [${i}] 과거 실패:`, { goal: goal.title });
          }
          tempStreak = 0;
        }
      }
      
      // 모든 목표가 성공인 경우 현재 연속 = 전체 성공 수
      if (!isCurrentStreakSet) {
        currentStreak = tempStreak;
        console.log('🎯 모든 목표 성공, 현재 연속 = 전체:', currentStreak);
      }
      
      // 2025/07/18 특별 디버깅
      const july18Goals = goals?.filter(g => formatDate(new Date(g.target_time)) === '2025-07-18') || [];
      console.log('🎯 2025/07/18 목표들 상세 확인:', {
        총개수: july18Goals.length,
        상세목표들: july18Goals.map(g => ({
          title: g.title,
          status: g.status,
          target_time: g.target_time,
          korean_date: formatDate(new Date(g.target_time))
        })),
        성공개수: july18Goals.filter(g => g.status === 'success').length,
        실패개수: july18Goals.filter(g => g.status === 'failure').length
      });

      console.log('📊 최종 연속 기록 결과:', { 
        currentStreak, 
        bestStreak, 
        totalSuccessGoals: successGoals,
        계산에사용된목표수: sortedGoals.filter(g => g.status !== 'pending').length,
        모든목표현황: {
          success: goals?.filter(g => g.status === 'success').length,
          failure: goals?.filter(g => g.status === 'failure').length,
          pending: goals?.filter(g => g.status === 'pending').length
        }
      });

      // 🚨 강제 디버깅: 데이터 검증
      console.log('🚨 [ANALYTICS] 계산 완료 - 상태 업데이트 중:', {
        이전통계: get().statistics,
        새로운통계예상: {
          totalGoals,
          successGoals,
          failureGoals,
          successRate,
          currentStreak,
          bestStreak,
          retrospectCount: retrospects?.length || 0
        }
      });

      // 최고 시간대 계산
      const hourlySuccess: { [key: number]: { total: number; success: number } } = {};
      goals?.forEach(goal => {
        const hour = new Date(goal.target_time).getHours();
        if (!hourlySuccess[hour]) hourlySuccess[hour] = { total: 0, success: 0 };
        hourlySuccess[hour].total++;
        if (goal.status === 'success') hourlySuccess[hour].success++;
      });

      let bestHour = 0;
      let bestHourRate = 0;
      Object.entries(hourlySuccess).forEach(([hour, stats]) => {
        const rate = stats.total > 0 ? stats.success / stats.total : 0;
        if (rate > bestHourRate) {
          bestHourRate = rate;
          bestHour = parseInt(hour);
        }
      });

      // 최고 요일 계산
      const dailySuccess: { [key: number]: { total: number; success: number } } = {};
      goals?.forEach(goal => {
        const day = new Date(goal.target_time).getDay();
        if (!dailySuccess[day]) dailySuccess[day] = { total: 0, success: 0 };
        dailySuccess[day].total++;
        if (goal.status === 'success') dailySuccess[day].success++;
      });

      let bestDayOfWeek = 0;
      let bestDayRate = 0;
      Object.entries(dailySuccess).forEach(([day, stats]) => {
        const rate = stats.total > 0 ? stats.success / stats.total : 0;
        if (rate > bestDayRate) {
          bestDayRate = rate;
          bestDayOfWeek = parseInt(day);
        }
      });

      // 시작일로부터 경과 일수
      const firstGoal = goals?.sort((a, b) => new Date(a.target_time).getTime() - new Date(b.target_time).getTime())[0];
      const daysSinceStart = firstGoal ? 
        Math.ceil((Date.now() - new Date(firstGoal.target_time).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      const statistics: UserStatistics = {
        totalGoals,
        successGoals,
        failureGoals,
        successRate,
        currentStreak,
        bestStreak,
        bestHour,
        bestDayOfWeek,
        daysSinceStart,
        retrospectCount: retrospects?.length || 0
      };

      console.log('🚨 최종 statistics 객체:', statistics);

      set({ statistics, loading: false });
    } catch (error) {
      console.error('통계 가져오기 오류:', error);
      set({ loading: false });
    }
  },

  fetchHourlyStats: async () => {
    const { session } = useUserStore.getState();
    if (!session) return;

    try {
      const { data: goals, error } = await supabase
        .from('goals')
        .select('status, target_time')
        .eq('user_id', session.user.id)
        .gte('target_time', new Date(Date.now() - 180 * 86400000).toISOString()) // 6개월 제한
        .lte('target_time', new Date(Date.now() + 1 * 86400000).toISOString()); // 내일까지

      if (error) throw error;

      const hourlyStats: HourlyStats[] = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourGoals = goals?.filter(g => new Date(g.target_time).getHours() === hour) || [];
        const totalGoals = hourGoals.length;
        const successGoals = hourGoals.filter(g => g.status === 'success').length;
        const successRate = totalGoals > 0 ? Math.round((successGoals / totalGoals) * 100) : 0;

        if (totalGoals > 0) {
          hourlyStats.push({ hour, totalGoals, successGoals, successRate });
        }
      }

      set({ hourlyStats });
    } catch (error) {
      console.error('시간대별 통계 가져오기 오류:', error);
    }
  },

  fetchDailyStats: async () => {
    const { session } = useUserStore.getState();
    if (!session) return;

    try {
      const { data: goals, error } = await supabase
        .from('goals')
        .select('status, target_time')
        .eq('user_id', session.user.id)
        .gte('target_time', new Date(Date.now() - 180 * 86400000).toISOString()) // 6개월 제한
        .lte('target_time', new Date(Date.now() + 1 * 86400000).toISOString()); // 내일까지

      if (error) throw error;

      const dailyStats: DailyStats[] = [];
      for (let day = 0; day < 7; day++) {
        const dayGoals = goals?.filter(g => new Date(g.target_time).getDay() === day) || [];
        const totalGoals = dayGoals.length;
        const successGoals = dayGoals.filter(g => g.status === 'success').length;
        const successRate = totalGoals > 0 ? Math.round((successGoals / totalGoals) * 100) : 0;

        if (totalGoals > 0) {
          dailyStats.push({ dayOfWeek: day, totalGoals, successGoals, successRate });
        }
      }

      set({ dailyStats });
    } catch (error) {
      console.error('요일별 통계 가져오기 오류:', error);
    }
  },

  fetchAdminInsights: async () => {
    try {
      const { data, error } = await supabase
        .from('admin_insights')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      const adminInsights: AdminInsight[] = data?.map(insight => ({
        id: insight.id,
        title: insight.title,
        description: insight.description,
        insightType: insight.insight_type,
        isActive: insight.is_active,
        displayOrder: insight.display_order
      })) || [];

      set({ adminInsights });
    } catch (error) {
      console.error('관리자 인사이트 가져오기 오류:', error);
    }
  },

  updateStatistics: async () => {
    const { calculateStatistics, fetchHourlyStats, fetchDailyStats } = get();
    await Promise.all([
      calculateStatistics(),
      fetchHourlyStats(),
      fetchDailyStats()
    ]);
  },

  getBestTimeSlot: () => {
    const { statistics } = get();
    if (!statistics || statistics.successGoals === 0) return '데이터 부족';
    return getTimeSlot(statistics.bestHour);
  },

  getBestDay: () => {
    const { statistics } = get();
    if (!statistics || statistics.successGoals === 0) return '데이터 부족';
    return getDayName(statistics.bestDayOfWeek);
  }
}));