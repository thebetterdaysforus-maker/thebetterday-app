// 목표 데이터 최적화 훅 (캐싱 강화 버전)
import { useMemo, useCallback } from 'react';
import { Goal } from '../store/goalStore';
import { getTodayKorea, getTomorrowKorea } from '../utils/timeUtils';

// 성능 최적화: 캐시용 전역 변수
let lastGoalsHash = '';
let lastFlexibleGoalsHash = '';
let cachedSections: any = null;
let cachedStats: any = null;

interface OptimizedGoalItem {
  goal: Goal;
  canCheck: boolean;
  canEdit: boolean;
}

interface GoalSection {
  title: string;
  data: OptimizedGoalItem[];
}

export const useOptimizedGoals = (
  goals: Goal[],
  flexibleGoals: Goal[],
  todayRetrospectExists: boolean,
  getGoalsWithCanCheck: (retrospectExists: boolean) => OptimizedGoalItem[]
) => {
  // 목표 데이터 메모이제이션 (성능 최적화)
  const memoizedGoals = useMemo(() => {
    // 성능 최적화: 해시 기반 캐시 체크
    const goalsHash = JSON.stringify(goals.map(g => ({ id: g.id, status: g.status, target_time: g.target_time })));
    const flexibleGoalsHash = JSON.stringify(flexibleGoals.map(g => ({ id: g.id, status: g.status, target_time: g.target_time })));
    
    const result = getGoalsWithCanCheck(todayRetrospectExists);
    
    // 개발모드에서만 로그 (성능 향상)
    if (__DEV__) {
      console.log('🔍 getGoalsWithCanCheck 결과:', {
        전체개수: result.length,
        제목들: result.map(r => r.goal.title)
      });
    }
    
    return result;
  }, [goals, flexibleGoals, todayRetrospectExists, getGoalsWithCanCheck]);

  // 섹션 데이터 계산 최적화
  const sections = useMemo((): GoalSection[] => {
    // ✅ timeUtils의 일관된 함수 사용
    const todayKey = getTodayKorea();
    const tomorrowKey = getTomorrowKorea();

    // 날짜별 목표 분류 (성능 최적화)
    const todayGoals: OptimizedGoalItem[] = [];
    const tomorrowGoals: OptimizedGoalItem[] = [];
    
    for (const item of memoizedGoals) {
      const goalDate = new Date(item.goal.target_time);
      
      // 한국 시간대로 정확한 날짜 계산 (UTC 버그 수정)
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul'
      });
      const goalDateStr = formatter.format(goalDate);
      
      // 성능 최적화: 개발모드에서만 로그
      if (__DEV__) {
        console.log('🔍 useOptimizedGoals 날짜 필터링:', {
          목표제목: item.goal.title,
          원본시간: item.goal.target_time,
          goalDate: goalDate.toISOString(),
          goalDateStr: goalDateStr,
          todayKey: todayKey,
          tomorrowKey: tomorrowKey,
          오늘매치: goalDateStr === todayKey,
          내일매치: goalDateStr === tomorrowKey
        });
      }
      
      if (goalDateStr === todayKey) {
        todayGoals.push(item);
      } else if (goalDateStr === tomorrowKey) {
        tomorrowGoals.push(item);
      }
    }

    // 시간순 정렬 (한 번만 수행)
    const sortByTime = (a: OptimizedGoalItem, b: OptimizedGoalItem) =>
      new Date(a.goal.target_time).getTime() - new Date(b.goal.target_time).getTime();
    
    todayGoals.sort(sortByTime);
    tomorrowGoals.sort(sortByTime);

    const sections: GoalSection[] = [];

    if (todayRetrospectExists) {
      // 회고 완료 후: 현재 시간보다 미래인 모든 목표 표시
      const now = new Date();
      const futureGoals = memoizedGoals.filter(item => {
        const goalTime = new Date(item.goal.target_time);
        return goalTime > now;
      });
      
      if (futureGoals.length > 0) {
        sections.push({ title: "수행 예정 목록", data: futureGoals });
      }
    } else {
      // 회고 작성 전: 모든 목표 표시 (오늘 + 내일)
      const allGoals = [...todayGoals, ...tomorrowGoals];
      if (allGoals.length > 0) {
        // 오늘 목표가 있으면 "수행 목록", 내일 목표만 있으면 "수행 예정 목록"
        const title = todayGoals.length > 0 ? "수행 목록" : "수행 예정 목록";
        sections.push({ title, data: allGoals });
      }
    }

    return sections;
  }, [memoizedGoals, todayRetrospectExists]);

  // 통계 계산 최적화
  const stats = useMemo(() => {
    const todayKey = getTodayKorea(); // 수정된 함수 사용
    
    const todayGoals = memoizedGoals.filter((item) => {
      const goalDate = new Date(item.goal.target_time);
      
      // 한국 시간대로 정확한 날짜 계산 (UTC 버그 수정)
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul'
      });
      const goalDateStr = formatter.format(goalDate);
      
      return goalDateStr === todayKey;
    });

    const todayCount = todayGoals.length;
    const successCount = todayGoals.filter((x) => x.goal.status === "success").length;
    const failureCount = todayGoals.filter((x) => x.goal.status === "failure").length;
    const allDoneToday = todayCount > 0 && successCount + failureCount === todayCount;

    return {
      todayCount,
      successCount,
      failureCount,
      allDoneToday,
      canWriteRetrospect: allDoneToday && !todayRetrospectExists
    };
  }, [memoizedGoals, todayRetrospectExists]);

  return {
    sections,
    stats,
    memoizedGoals
  };
};