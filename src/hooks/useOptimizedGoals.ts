// 목표 데이터 최적화 훅
import { useMemo, useCallback } from 'react';
import { Goal } from '../store/goalStore';

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
  // 목표 데이터 메모이제이션
  const memoizedGoals = useMemo(() => {
    return getGoalsWithCanCheck(todayRetrospectExists);
  }, [goals, flexibleGoals, todayRetrospectExists, getGoalsWithCanCheck]);

  // 섹션 데이터 계산 최적화
  const sections = useMemo((): GoalSection[] => {
    const now = new Date();
    const koreaOffset = 9 * 60; // KST는 UTC+9
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const koreaTime = new Date(utcTime + koreaOffset * 60000);
    
    const todayKey = koreaTime.toISOString().slice(0, 10);
    const tomorrowKey = new Date(koreaTime.getTime() + 86400000)
      .toISOString()
      .slice(0, 10);

    // 날짜별 목표 분류 (성능 최적화)
    const todayGoals: OptimizedGoalItem[] = [];
    const tomorrowGoals: OptimizedGoalItem[] = [];
    
    for (const item of memoizedGoals) {
      const goalDate = new Date(item.goal.target_time);
      const goalKoreaTime = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
      const goalDateStr = goalKoreaTime.toISOString().slice(0, 10);
      
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
      // 회고 완료 후: 내일 목표 표시
      if (tomorrowGoals.length > 0) {
        sections.push({ title: "수행 예정 목록", data: tomorrowGoals });
      }
    } else {
      // 회고 작성 전: 오늘 목표 우선 표시
      if (todayGoals.length > 0) {
        const hasPassedGoals = todayGoals.some((item) => {
          const goalTime = new Date(item.goal.target_time);
          return goalTime.getTime() <= koreaTime.getTime();
        });
        
        const title = hasPassedGoals ? "수행 목록" : "수행 예정 목록";
        sections.push({ title, data: todayGoals });
      } else if (tomorrowGoals.length > 0) {
        sections.push({ title: "수행 예정 목록", data: tomorrowGoals });
      }
    }

    return sections;
  }, [memoizedGoals, todayRetrospectExists]);

  // 통계 계산 최적화
  const stats = useMemo(() => {
    const todayGoals = memoizedGoals.filter((item) => {
      const goalDate = new Date(item.goal.target_time);
      const goalKoreaTime = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
      const now = new Date();
      const koreaTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + 9 * 60 * 60 * 1000);
      return goalKoreaTime.toISOString().slice(0, 10) === koreaTime.toISOString().slice(0, 10);
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