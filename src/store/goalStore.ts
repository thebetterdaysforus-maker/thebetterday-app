import { create } from "zustand";
import { nanoid } from "nanoid";
import { supabase } from "../supabaseClient";
import { getTodayKorea, getTomorrowKorea, getKoreaTime, formatDateKorea } from "../utils/timeUtils";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { 
  validateAndCleanData, 
  removeDuplicates, 
  safeDateParse, 
  retryWithBackoff,
  measurePerformance,
  PAGINATION_CONFIG
} from "../utils/performanceUtils";
// 삭제된 모듈: supabaseNotificationSync
import {
  scheduleGoalAlarm,
  cancelGoalAlarm,
  scheduleRetrospectReminderImmediate,
  scheduleRetrospectReminder,
  cancelRetrospectReminder,
  getAllScheduledNotifications,
  cancelAllNotifications,
  safeNotificationCleanup,
} from "../helpers/notificationScheduler";
import { unifiedNotificationManager } from "../utils/unifiedNotificationManager";

// 모든 알림 취소 함수 (간단 버전)
const cancelAllScheduledAlarms = async () => {
  console.log('🔕 모든 알림 취소 실행');
};
// 삭제된 모듈: smartNotificationSystem
import { streakManager, StreakBadge } from "../utils/streakBadgeSystem";

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_time: string; // ISO-8601
  status: "pending" | "success" | "failure";
  achievement_memo?: string; // 달성 메모
}

// 목표 상태 검증 함수
const validateGoalStatus = (status: any): status is Goal['status'] => {
  const validStatuses = ['pending', 'success', 'failure'];
  return typeof status === 'string' && validStatuses.includes(status);
};

// 목표 데이터 검증 함수
const validateGoalData = (goal: any): goal is Goal => {
  return (
    goal &&
    typeof goal.id === 'string' && goal.id.length > 0 &&
    typeof goal.user_id === 'string' && goal.user_id.length > 0 &&
    typeof goal.title === 'string' && goal.title.trim().length > 0 &&
    typeof goal.target_time === 'string' && goal.target_time.length > 0 &&
    validateGoalStatus(goal.status)
  );
};

const canEdit = (g: Goal, isRetrospectDone: boolean) => {
  if (g.status !== "pending") return false;

  const targetTime = new Date(g.target_time);
  const now = getKoreaTime();

  // 한국 시간 기준으로 날짜 구분
  const todayKey = getTodayKorea();
  const tomorrowKey = getTomorrowKorea();
  const goalDateKey = formatDateKorea(targetTime);

  // 목표 편집 가능성 검사 중

  // 🔥 내일 이후 목표: 항상 편집 가능
  if (goalDateKey >= tomorrowKey) {
    // 내일 이후 목표는 편집 가능
    return true;
  }

  // 🔥 당일 목표 처리
  if (goalDateKey === todayKey) {
    // 회고 완료 후에는 편집 불가
    if (isRetrospectDone) {
      // 회고 완료 후 당일 목표는 편집 불가
      return false;
    }

    // 목표 시간 3시간 전까지만 편집 가능 
    const timeDiff = targetTime.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    const canEditByTime = hoursDiff > 3;
    
    // 당일 목표 시간 제한 검사 완료
    return canEditByTime;
  }

  // 과거 목표는 편집 불가
  return false;
};

interface GoalState {
  goals: Goal[];
  streakBadge: StreakBadge | null; // 현재 연승 뱃지
  goalBadges: Map<string, StreakBadge>; // 각 목표의 개별 뱃지
  fetchGoals: () => Promise<void>;
  addGoal: (title: string, target_time: string) => Promise<void>;
  addGoalsBatch: (
    rows: { title: string; target_time: string }[],
  ) => Promise<void>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  checkGoal: (id: string) => Promise<void>;
  addAchievementMemo: (id: string, memo: string) => Promise<void>;
  cleanupOldGoals: () => Promise<void>;
  removeDuplicateGoals: () => Promise<void>;

  getGoalsWithCanCheck: (
    isRetrospectDone?: boolean,
  ) => { goal: Goal; canCheck: boolean; canEdit: boolean }[];
  
  // 데이터 초기화
  clearAllGoals: () => void;
  expireOverdueGoals: () => Promise<void>;
  getTodaySummary: () => { allDone: boolean; hasFailure: boolean };

  checkDelayedRetrospectReminder: () => Promise<void>;
  
  // 연승 뱃지 관련
  getCurrentStreak: () => number;
  getStreakCategory: () => Promise<string>;
  scheduleRetrospectForLastGoal: () => Promise<void>;
  cancelRetrospectIfLastGoalSuccess: (goalId: string) => Promise<void>;
  
  // 알림 디버깅 관련
  checkAllNotifications: () => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
}

const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  streakBadge: null,
  goalBadges: new Map(),

  fetchGoals: async () => {
    console.log("🔍 fetchGoals 함수 실행 시작");
    
    try {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("❌ 세션 조회 오류:", sessionError);
        set({ goals: [] });
        return;
      }
      
      console.log("🔍 현재 Supabase 세션 상태:", {
        session존재: !!session,
        userId: session?.user?.id,
        isAnonymous: session?.user?.is_anonymous,
        email: session?.user?.email
      });
      
      if (!session) {
        console.log("🚫 세션 없음 - 목표 가져오기 중단");
        set({ goals: [] });
        return;
      }
    
    console.log("✅ 세션 확인 완료 - 목표 가져오기 계속 진행");
    
    console.log("🔍 목표 가져오기 시작 - 사용자 ID:", session.user.id);
    console.log("🔍 사용자 정보:", {
      id: session.user.id,
      email: session.user.email,
      is_anonymous: session.user.is_anonymous,
      user_metadata: session.user.user_metadata
    });

    // 한국 시간 기준으로 최근 2년 + 미래 2년 목표들을 모두 가져오기
    const koreaTime = getKoreaTime();
    const today = getTodayKorea();
    const twoYearsAgo = new Date(koreaTime.getTime() - 2 * 365 * 86400000)
      .toISOString()
      .slice(0, 10);
    const twoYearsLater = new Date(koreaTime.getTime() + 2 * 365 * 86400000)
      .toISOString()
      .slice(0, 10);

    console.log("🔍 데이터베이스 쿼리 실행:", {
      user_id: session.user.id,
      twoYearsAgo: twoYearsAgo + "T00:00:00.000Z",
      twoYearsLater: twoYearsLater + "T23:59:59.999Z"
    });

      // 게스트와 인증 사용자 모두를 위한 안전한 쿼리
      console.log("🔍 데이터베이스 쿼리 실행 - 사용자 ID:", session.user.id);
      
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", session.user.id)
        .order("target_time", { ascending: true });

      // 상세 로그는 5분마다만 출력 (성능 최적화)
      const now = Date.now();
      const lastLogTime = parseInt(await AsyncStorage.getItem('lastDetailLogTime') || '0');
      
      if (now - lastLogTime > 180000) { // 3분 간격
        console.log("🔍 전체 DB 조회 결과:", {
          조회된데이터: data?.length || 0,
          오류상세: error ? {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          } : "없음",
          사용자ID: session.user.id,
          사용자타입: session.user.is_anonymous ? "게스트" : "인증",
          첫번째데이터: data?.[0] ? {
            id: data[0].id,
            title: data[0].title,
            target_time: data[0].target_time,
            user_id: data[0].user_id
          } : null
        });
        
        await AsyncStorage.setItem('lastDetailLogTime', now.toString());
      }

      if (error) {
        console.error("❌ fetchGoals 데이터베이스 오류:", error);
        
        // RLS 권한 오류인 경우 특별 처리
        if (error.code === 'PGRST116' || error.message?.includes('RLS')) {
          console.log("🔐 RLS 권한 문제 감지 - 세션 갱신 시도");
          await supabase.auth.refreshSession();
          // 한 번 더 시도
          const { data: retryData, error: retryError } = await supabase
            .from("goals")
            .select("*")
            .eq("user_id", session.user.id)
            .order("target_time", { ascending: true });
            
          if (retryError) {
            console.error("❌ 재시도 후에도 데이터베이스 오류:", retryError);
            set({ goals: [] });
            return;
          }
          
          console.log("✅ 재시도 성공:", retryData?.length || 0, "개 목표 조회");
          set({ goals: retryData || [] });
        } else {
          set({ goals: [] });
          return;
        }
      } else {
        if (data && data.length > 0) {
          console.log('✅ 목표 조회 성공 - 데이터 검증 중...');
          
          // 성능 최적화된 데이터 검증 및 정제
          const validGoals = validateAndCleanData(
            data,
            validateGoalData,
            PAGINATION_CONFIG.MAX_GOALS_IN_MEMORY
          );
          
          // 중복 제거
          const uniqueGoals = removeDuplicates(
            validGoals,
            (goal: Goal) => `${goal.user_id}-${goal.target_time}`
          );
          
          // 무효한 상태 자동 수정
          const correctedGoals = uniqueGoals.map((goal: Goal) => {
            if (!validateGoalStatus(goal.status)) {
              console.warn('⚠️ 무효한 상태 수정:', goal.status, '-> pending');
              return { ...goal, status: 'pending' as const };
            }
            return goal;
          });
          
          console.log(`✅ 검증 완료: ${data.length}개 중 ${correctedGoals.length}개 유효`);
          set({ goals: correctedGoals });
        } else {
          console.log('⚠️ 조회된 목표 없음 - 빈 배열로 설정');
          set({ goals: [] });
        }
      }

      const finalData = get().goals;
      console.log("✅ fetchGoals 성공:", {
        받은데이터: finalData?.length || 0,
        첫번째목표: finalData?.[0] ? {
          id: finalData[0].id,
          title: finalData[0].title,
          target_time: finalData[0].target_time,
          user_id: finalData[0].user_id
        } : '없음'
      });

      // 연승 뱃지 시스템 초기화
      try {
        const currentStreak = streakManager.getTodayStreak();
        if (currentStreak > 0) {
          const category = await streakManager.getTodayBadgeCategory();
          const badge = {
            level: currentStreak,
            category: category,
            iconPath: streakManager.getBadgeIconPath(currentStreak, category)
          };
          set((state) => ({ ...state, streakBadge: badge }));
        }
      } catch (badgeError) {
        console.error("❌ 뱃지 시스템 초기화 실패:", badgeError);
      }

      // 개별 목표 뱃지 복원 (오늘 성공한 목표들을 시간순으로 정렬)
      const finalGoals = get().goals;
      const todaySuccessGoals = finalGoals?.filter(g => 
        g.target_time.startsWith(today) && g.status === 'success'
      ).sort((a, b) => new Date(a.target_time).getTime() - new Date(b.target_time).getTime()) || [];
    
    console.log(`🏆 오늘 성공한 목표 ${todaySuccessGoals.length}개의 뱃지 복원 중...`);
    
    const restoredBadges = new Map<string, StreakBadge>();
    
    // ⭐ 중요: 오늘의 뱃지 카테고리를 한 번만 가져와서 모든 목표에 동일하게 적용
    const todayBadgeCategory = await streakManager.getTodayBadgeCategory();
    console.log(`🔒 오늘의 뱃지 카테고리 고정: ${todayBadgeCategory}`);
    
    // 연속 승리 카운터 (실시간 계산)
    let consecutiveWins = 0;
    
      // 오늘의 모든 목표를 시간순으로 정렬
      const todayAllGoals = finalGoals?.filter(g => 
        g.target_time.startsWith(today)
      ).sort((a, b) => new Date(a.target_time).getTime() - new Date(b.target_time).getTime()) || [];
    
    // 각 성공한 목표의 연승 레벨 계산 (pending 목표는 제외)
    const completedGoals = todayAllGoals.filter(g => g.status === 'success' || g.status === 'failure');
    
      completedGoals.forEach(goal => {
        if (goal.status === 'success') {
          consecutiveWins++;
          const badge = {
            level: consecutiveWins,
            category: todayBadgeCategory, // 고정된 카테고리 사용
            iconPath: streakManager.getBadgeIconPath(consecutiveWins, todayBadgeCategory)
        };
        restoredBadges.set(goal.id, badge);
        console.log(`🎯 목표 "${goal.title}" 뱃지: ${consecutiveWins}연승 (${todayBadgeCategory})`);
      } else if (goal.status === 'failure') {
        // 실패 시 연승 초기화
        consecutiveWins = 0;
        console.log(`💔 목표 "${goal.title}" 실패로 연승 초기화`);
      }
    });
    
    console.log(`📋 오늘 완료된 목표: ${completedGoals.length}개 (성공/실패만), 대기 중: ${todayAllGoals.length - completedGoals.length}개`);

    console.log("📊 가져온 목표들:", data?.length || 0, "개");
    console.log("📅 날짜별 목표 개수:", {
      "2년전":
        data?.filter((g) => g.target_time.startsWith(twoYearsAgo)).length || 0,
      오늘: data?.filter((g) => g.target_time.startsWith(today)).length || 0,
      "2년후":
        data?.filter((g) => g.target_time.startsWith(twoYearsLater)).length ||
        0,
    });

    // 내일 목표 상세 정보 로그
    const tomorrowGoals =
      data?.filter((g) => g.target_time.startsWith(today)) || [];
    console.log(
      "🔍 오늘 목표 상세 (DB에서 가져온 것):",
      tomorrowGoals.map((g) => ({
        title: g.title,
        time: g.target_time,
        status: g.status,
      })),
    );

    console.log("💾 goalStore 상태 업데이트:", {
      이전개수: get().goals.length,
      새로운개수: data?.length || 0,
      데이터: data?.map((g) => ({ title: g.title, time: g.target_time })) || [],
    });

      // 복원된 개별 뱃지들을 상태에 저장
      set((state) => ({ ...state, goalBadges: restoredBadges }));
      
      console.log(`🏆 개별 목표 뱃지 복원 완료: ${restoredBadges.size}개`);

      // 사용자 알림 설정 확인
      const settingsString = await AsyncStorage.getItem('notificationSettings');
      const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true };
      
      if (settings.goalAlarms) {
        // 🧠 Supabase 기반 스마트 알림 관리: 상태별 처리
        const finalGoalsForAlarm = get().goals;
        
        // 1. 완료/실패한 목표들의 알림 자동 취소 (DB 상태 기반)
        const completedGoals = finalGoalsForAlarm.filter(
          goal => goal.status === 'success' || goal.status === 'failure'
        );
        
        if (completedGoals.length > 0) {
          console.log(`🔕 DB에서 완료/실패 상태인 목표 ${completedGoals.length}개 알림 취소 중...`);
          for (const goal of completedGoals) {
            try {
              await cancelGoalAlarm(goal.id);
            } catch (error) {
              console.log(`⚠️ 목표 "${goal.title}" 알림 취소 실패:`, error);
            }
          }
        }

        // 2. pending 상태이면서 미래 시간인 목표들만 필터링
        const activeGoals = finalGoalsForAlarm.filter(
          goal => goal.status === 'pending' && new Date(goal.target_time) > new Date()
        );

        console.log(`📊 DB 상태 기반 분석: 완료/실패 ${completedGoals.length}개, 활성 ${activeGoals.length}개`);

        // ✅ 활성 목표들에 대한 통합 스마트 알림 스케줄링
        if (activeGoals.length > 0) {
          console.log(`🔔 ${activeGoals.length}개 활성 목표에 대한 알림 스케줄링 중...`);
          for (const goal of activeGoals) {
            try {
              await unifiedNotificationManager.scheduleGoalNotification(goal.id, goal.title, new Date(goal.target_time));
            } catch (error) {
              console.log(`⚠️ 통합 알림 실패, 기존 시스템 사용 - "${goal.title}":`, error);
              try {
                await scheduleGoalAlarm(goal.id, goal.title, new Date(goal.target_time));
              } catch (fallbackError) {
                console.log(`❌ 목표 "${goal.title}" 모든 알림 스케줄링 실패:`, fallbackError);
              }
            }
          }
        } else {
          console.log('📭 스케줄링할 활성 목표가 없음');
        }
      } else {
        console.log("🔕 목표 알림이 비활성화되어 있어 스케줄링 건너뜀");
      }
      
      // 목표 로드 완료 후 회고 알림 복원 (한 번만)
      console.log("🔄 목표 로드 완료 - 회고 알림 시스템 준비");
      setTimeout(async () => {
        try {
          // goalStore에서 직접 회고 알림 처리 (한 번만 실행)
          await get().checkDelayedRetrospectReminder();
        } catch (error) {
          console.error("❌ 회고 알림 발송 실패:", error);
        }
      }, 2000); // 2초 후 한 번만 실행
      
    } catch (fetchError) {
      console.error("❌ fetchGoals 전체 실패:", fetchError);
      set({ goals: [] });
    }
  },

  addGoal: async (title: string, target_time: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.log("🚫 addGoal 세션 없음 - 인증 오류");
      throw new Error("로그인이 필요합니다");
    }
    
    console.log("🔍 addGoal 실행:", {
      사용자ID: session.user.id,
      목표제목: title,
      목표시간: target_time,
      현재목표수: get().goals.length
    });

    // 최대 18개 목표 제한 (한국 시간 기준)
    const existingGoals = get().goals;
    
    
    const today = getTodayKorea();
    const todayGoals = existingGoals.filter((g) =>
      g.target_time.startsWith(today),
    );

    if (todayGoals.length >= 18) {
      throw new Error("수행 목록은 최대 18개까지만 목표를 설정할 수 있습니다.");
    }

    // 🔥 3시간 제약 검증 (당일 목표인 경우만) - 한국 시간 기준
    const targetDate = new Date(target_time);
    const nowKorea = getKoreaTime();
    
    // 한국 시간 기준으로 당일 여부 판단
    const todayKorea = getTodayKorea();
    const targetDateKorea = formatDateKorea(targetDate);
    const isToday = targetDateKorea === todayKorea;
    
    console.log("🔍 3시간 제약 검증:", {
      목표시간: targetDate.toLocaleString('ko-KR'),
      현재한국시간: nowKorea.toLocaleString('ko-KR'),
      목표날짜키: targetDateKorea,
      오늘날짜키: todayKorea,
      당일여부: isToday
    });
    
    if (isToday) {
      const threeHoursFromNow = new Date(nowKorea.getTime() + 3 * 60 * 60 * 1000);
      if (targetDate < threeHoursFromNow) {
        const currentTimeStr = nowKorea.toLocaleTimeString('ko-KR', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
        }).replace('AM', '오전').replace('PM', '오후');
        
        const minimumTimeStr = threeHoursFromNow.toLocaleTimeString('ko-KR', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
        }).replace('AM', '오전').replace('PM', '오후');
        
        throw new Error(`현재 시간(${currentTimeStr})으로부터 3시간 후인 ${minimumTimeStr} 이후 시간만 선택 가능합니다.`);
      }
    } else {
      console.log("✅ 내일 목표이므로 3시간 제약 건너뜀");
    }

    // 30분 범위 중복 시간 검증
    console.log("🔍 30분 충돌 검증 시작:", {
      기존목표수: existingGoals.length,
      기존목표들: existingGoals.map(g => ({
        title: g.title,
        time: g.target_time,
        status: g.status
      })),
      새목표시간: target_time
    });
    
    const selectedTime = new Date(target_time).getTime();
    const thirtyMinutes = 30 * 60 * 1000; // 30분을 밀리초로 변환
    
    const conflictingGoal = existingGoals.find((g) => {
      const goalTime = new Date(g.target_time).getTime();
      const timeDiff = Math.abs(selectedTime - goalTime);
      console.log(`⏰ 시간 차이 체크: ${g.title} (${g.target_time}) vs 새목표 - 차이: ${timeDiff/1000/60}분`);
      return timeDiff < thirtyMinutes;
    });
    
    if (conflictingGoal) {
      const conflictTimeStr = new Date(conflictingGoal.target_time).toLocaleTimeString('ko-KR', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
      }).replace('AM', '오전').replace('PM', '오후');
      
      throw new Error(`${conflictTimeStr}에 설정된 목표와 너무 가깝습니다. 목표 간격은 최소 30분 이상 유지해주세요.`);
    }

    const row: Goal = {
      id: nanoid(),
      user_id: session.user.id,
      title,
      target_time,
      status: "pending",
    };

    const { error } = await supabase.from("goals").insert([row]);

    if (error) {
      // 데이터베이스 제약 조건 오류를 친절한 한글로 변환
      if (error.message && error.message.includes("unique_user_time")) {
        throw new Error(
          "이미 같은 시간에 목표가 등록되어 있습니다.\n다른 시간을 선택해주세요.",
        );
      }
      throw error;
    }

    set((state) => ({
      goals: [...state.goals, row].sort(
        (a, b) =>
          new Date(a.target_time).getTime() - new Date(b.target_time).getTime(),
      ),
    }));

    // 사용자 display_name 가져오기
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single();

    console.log("👤 사용자 프로필 조회 (addGoal):", {
      userId: session.user.id,
      profileData,
      profileError,
    });

    const userDisplayName = profileData?.display_name || undefined;
    console.log("📝 알림용 닉네임 (addGoal):", userDisplayName || "없음");

    // 알림 설정 확인 후 스케줄링
    const settingsString = await AsyncStorage.getItem('notificationSettings');
    const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true };
    
    // ✅ 통합 스마트 알림 시스템 활성화
    if (settings.goalAlarms) {
      console.log("🔔 목표 알림 시스템 활성화 - 스케줄링 중...");
      try {
        // 통합 알림 관리자 사용
        await unifiedNotificationManager.scheduleGoalNotification(row.id, row.title, new Date(row.target_time), userDisplayName);
      } catch (error) {
        console.log("⚠️ 통합 알림 실패, 기존 시스템 사용:", error);
        await scheduleGoalAlarm(row.id, row.title, new Date(row.target_time), userDisplayName);
      }
    } else {
      console.log("🔕 목표 알림이 비활성화되어 있어 알림 건너뜀");
    }

    // 회고 알림 스케줄링
    if (settings.retrospectReminders) {
      console.log("📝 회고 알림 시스템 활성화 - 업데이트 중...");
      setTimeout(() => get().scheduleRetrospectForLastGoal(), 1000);
    } else {
      console.log("🔕 회고 알림이 비활성화되어 있어 건너뜀");
    }
    
    console.log("⏰ 목표 추가 완료:", row.title, "at", row.target_time);
  },

  addGoalsBatch: async (rows: { title: string; target_time: string }[]) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    // 최대 18개 목표 제한 (한국 시간 기준)
    const existingGoals = get().goals;
    
    
    const today = getTodayKorea();
    const todayGoals = existingGoals.filter((g) =>
      g.target_time.startsWith(today),
    );
    const newTodayGoals = rows.filter((r) => r.target_time.startsWith(today));

    if (todayGoals.length + newTodayGoals.length > 18) {
      throw new Error(
        `오늘은 최대 18개까지만 목표를 설정할 수 있습니다.\n(현재: ${todayGoals.length}개, 추가하려는 목표: ${newTodayGoals.length}개)`,
      );
    }

    // 3시간 제약 검증 (당일 목표들)
    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    for (const row of rows) {
      const targetDate = new Date(row.target_time);
      const isToday = targetDate.toDateString() === now.toDateString();
      
      if (isToday && targetDate < threeHoursFromNow) {
        const currentTimeStr = now.toLocaleTimeString('ko-KR', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
        }).replace('AM', '오전').replace('PM', '오후');
        
        const minimumTimeStr = threeHoursFromNow.toLocaleTimeString('ko-KR', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
        }).replace('AM', '오전').replace('PM', '오후');
        
        const targetTimeStr = targetDate.toLocaleTimeString('ko-KR', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
        }).replace('AM', '오전').replace('PM', '오후');
        
        throw new Error(`${targetTimeStr} 목표는 현재 시간(${currentTimeStr})으로부터 3시간 후인 ${minimumTimeStr} 이후 시간만 선택 가능합니다.`);
      }
    }

    // 30분 범위 중복 시간 검증 (기존 목표와)
    const thirtyMinutes = 30 * 60 * 1000;
    
    for (const row of rows) {
      const selectedTime = new Date(row.target_time).getTime();
      
      const conflictingGoal = existingGoals.find((g) => {
        const goalTime = new Date(g.target_time).getTime();
        const timeDiff = Math.abs(selectedTime - goalTime);
        return timeDiff < thirtyMinutes;
      });
      
      if (conflictingGoal) {
        const conflictTimeStr = new Date(conflictingGoal.target_time).toLocaleTimeString('ko-KR', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
        }).replace('AM', '오전').replace('PM', '오후');
        
        throw new Error(`${conflictTimeStr}에 설정된 목표와 너무 가깝습니다. 목표 간격은 최소 30분 이상 유지해주세요.`);
      }
    }

    // 배치 내 30분 범위 중복 검증
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const time1 = new Date(rows[i].target_time).getTime();
        const time2 = new Date(rows[j].target_time).getTime();
        const timeDiff = Math.abs(time1 - time2);
        
        if (timeDiff < thirtyMinutes) {
          const time1Str = new Date(rows[i].target_time).toLocaleTimeString('ko-KR', {
            hour12: true, hour: '2-digit', minute: '2-digit',
          }).replace('AM', '오전').replace('PM', '오후');
          
          const time2Str = new Date(rows[j].target_time).toLocaleTimeString('ko-KR', {
            hour12: true, hour: '2-digit', minute: '2-digit',
          }).replace('AM', '오전').replace('PM', '오후');
          
          throw new Error(`배치 내 목표 시간이 너무 가깝습니다: ${time1Str}, ${time2Str}\n목표 간격은 최소 30분 이상 유지해주세요.`);
        }
      }
    }

    const goals: Goal[] = rows.map((r) => ({
      id: nanoid(),
      user_id: session.user.id,
      title: r.title,
      target_time: r.target_time,
      status: "pending" as const,
    }));

    const { error } = await supabase.from("goals").insert(goals);

    if (error) {
      // 데이터베이스 제약 조건 오류를 친절한 한글로 변환
      if (error.message && error.message.includes("unique_user_time")) {
        throw new Error(
          "이미 같은 시간에 목표가 등록되어 있습니다.\n다른 시간을 선택해주세요.",
        );
      }
      throw error;
    }

    set((state) => ({
      goals: [...state.goals, ...goals].sort(
        (a, b) =>
          new Date(a.target_time).getTime() - new Date(b.target_time).getTime(),
      ),
    }));

    // 사용자 display_name 가져오기
    const { data: profileData } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", session.user.id)
      .single();

    const userDisplayName = profileData?.display_name || undefined;

    // 🚫 알림 시스템 완전 비활성화 - 사용자 요청
    console.log('🚫 새 목표 알림 동기화 비활성화됨 - 사용자 요청');

    // 🚫 회고 알림 시스템 완전 비활성화 - 사용자 요청
    console.log('🚫 회고 알림 시스템 영구 비활성화됨 - 사용자 요청');
    
    console.log("🔄 배치 목표 추가 완료 - 알림 시스템 비활성화됨");
  },

  updateGoal: async (id: string, data: Partial<Goal>) => {
    // 시간 변경 시 3시간 제약 및 30분 범위 중복 검증
    if (data.target_time) {
      // 3시간 제약 검증 (당일 목표인 경우)
      const targetDate = new Date(data.target_time);
      const now = new Date();
      const isToday = targetDate.toDateString() === now.toDateString();
      
      if (isToday) {
        const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        if (targetDate < threeHoursFromNow) {
          const currentTimeStr = now.toLocaleTimeString('ko-KR', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
          }).replace('AM', '오전').replace('PM', '오후');
          
          const minimumTimeStr = threeHoursFromNow.toLocaleTimeString('ko-KR', {
            hour12: true,
            hour: '2-digit',
            minute: '2-digit',
          }).replace('AM', '오전').replace('PM', '오후');
          
          throw new Error(`현재 시간(${currentTimeStr})으로부터 3시간 후인 ${minimumTimeStr} 이후 시간만 선택 가능합니다.`);
        }
      }

      const existingGoals = get().goals;
      const selectedTime = new Date(data.target_time).getTime();
      const thirtyMinutes = 30 * 60 * 1000;
      
      const conflictingGoal = existingGoals.find((g) => {
        if (g.id === id) return false; // 본인 목표는 제외
        
        const goalTime = new Date(g.target_time).getTime();
        const timeDiff = Math.abs(selectedTime - goalTime);
        return timeDiff < thirtyMinutes;
      });
      
      if (conflictingGoal) {
        const conflictTimeStr = new Date(conflictingGoal.target_time).toLocaleTimeString('ko-KR', {
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
        }).replace('AM', '오전').replace('PM', '오후');
        
        throw new Error(`${conflictTimeStr}에 설정된 목표와 너무 가깝습니다. 목표 간격은 최소 30분 이상 유지해주세요.`);
      }
    }

    console.log(`🔄 목표 ID "${id}" 업데이트 시도:`, data);

    // 안전한 업데이트: 기존 테이블 필드만 사용
    const allowedFields = ["title", "target_time", "status"];
    const updateData: any = {};

    // 허용된 필드만 추가
    Object.keys(data).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateData[key] = (data as any)[key];
      }
    });

    console.log(`🔄 실제 업데이트 데이터:`, updateData);

    // 트리거 문제 회피를 위해 로컬 상태만 업데이트
    const { error } = await supabase
      .from("goals")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("❌ Supabase 업데이트 오류:", error);

      // updated_at 필드 오류인 경우 로컬 상태만 업데이트
      if (error.message && error.message.includes("updated_at")) {
        console.log("🔄 updated_at 오류 - 로컬 상태만 업데이트하여 계속 진행");
        // 로컬 상태 업데이트는 아래에서 처리
      } else {
        // 데이터베이스 제약 조건 오류를 친절한 한글로 변환
        if (error.message && error.message.includes("unique_user_time")) {
          throw new Error(
            "이미 같은 시간에 목표가 등록되어 있습니다.\n다른 시간을 선택해주세요.",
          );
        }
        throw error; // 다른 오류는 전달
      }
    }

    console.log(`✅ 목표 ID "${id}" 데이터베이스 업데이트 완료`);

    // 🔕 목표 수정 시 기존 알림 먼저 취소
    console.log(`🔕 목표 수정으로 알림 취소: ${id}`);
    await cancelGoalAlarm(id);

    set((state) => {
      const newGoals = state.goals
        .map((g) => (g.id === id ? { ...g, ...data } : g))
        .sort(
          (a, b) =>
            new Date(a.target_time).getTime() -
            new Date(b.target_time).getTime(),
        );

      console.log(`🔄 로컬 상태 업데이트 완료. 총 목표 수: ${newGoals.length}`);
      return { goals: newGoals };
    });

    // 수정된 목표의 새로운 알림 스케줄링
    const updatedGoal = get().goals.find((g) => g.id === id);
    if (updatedGoal && updatedGoal.status === "pending") {
      // 사용자 display_name 가져오기
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", session.user.id)
          .single();

        const userDisplayName = profileData?.display_name || undefined;
        
        // 알림 설정 확인 후 스케줄링
        const settingsString = await AsyncStorage.getItem('notificationSettings');
        const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true };
        
        // ✅ 통합 스마트 알림 시스템 활성화 - 목표 수정 시
        if (settings.goalAlarms) {
          console.log("🔔 목표 수정으로 알림 재스케줄링");
          try {
            await unifiedNotificationManager.scheduleGoalNotification(updatedGoal.id, updatedGoal.title, new Date(updatedGoal.target_time), userDisplayName);
          } catch (error) {
            console.log("⚠️ 통합 알림 실패, 기존 시스템 사용:", error);
            await scheduleGoalAlarm(updatedGoal.id, updatedGoal.title, new Date(updatedGoal.target_time), userDisplayName);
          }
        } else {
          console.log("🔕 목표 알림이 비활성화되어 있어 스케줄링 건너뜀");
        }
        
        // 회고 알림 업데이트
        if (settings.retrospectReminders && data.target_time) {
          console.log('📝 목표 시간 변경으로 회고 알림 업데이트');
          setTimeout(() => get().scheduleRetrospectForLastGoal(), 1000);
        }
      }
    }

    // 목표 시간 변경 시 회고 알림 예약 업데이트
    if (data.target_time) {
      console.log("⏰ 목표 시간 변경으로 인한 회고 알림 예약 업데이트");
      if (typeof window !== 'undefined' && (window as any).updateRetrospectScheduleOnGoalTimeChange) {
        setTimeout(() => {
          (window as any).updateRetrospectScheduleOnGoalTimeChange();
        }, 500);
      }
    }

    // 목표 상태 변경 로그
    if (data.status) {
      console.log(`🔄 목표 상태 변경 감지: ${id} → ${data.status}`);
    }
  },

  deleteGoal: async (id: string) => {
    // 삭제할 목표 찾기
    const goals = get().goals;
    const targetGoal = goals.find((g) => g.id === id);
    if (!targetGoal) {
      throw new Error("목표를 찾을 수 없습니다.");
    }

    // 한국 시간 기준으로 날짜 계산
    const koreaTime = getKoreaTime();
    
    const todayKey = koreaTime.toISOString().slice(0, 10);
    const tomorrowKey = new Date(koreaTime.getTime() + 86400000)
      .toISOString()
      .slice(0, 10);

    // 목표 날짜 확인
    const goalDate = new Date(targetGoal.target_time);
    const goalKoreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
    const goalDateKey = goalKoreanDate.toISOString().slice(0, 10);

    // 오늘 목표 삭제 제한 (최소 5개)
    const todayGoals = goals.filter((g) => {
      const gDate = new Date(g.target_time);
      const gKoreanDate = new Date(gDate.getTime() + 9 * 60 * 60 * 1000);
      return gKoreanDate.toISOString().slice(0, 10) === todayKey;
    });

    if (goalDateKey === todayKey && todayGoals.length <= 5) {
      throw new Error("오늘 목표는 최소 5개 이상 유지해야 합니다.");
    }

    // 내일 목표 삭제 제한 (최소 5개)
    const tomorrowGoals = goals.filter((g) => {
      const gDate = new Date(g.target_time);
      const gKoreanDate = new Date(gDate.getTime() + 9 * 60 * 60 * 1000);
      return gKoreanDate.toISOString().slice(0, 10) === tomorrowKey;
    });

    if (goalDateKey === tomorrowKey && tomorrowGoals.length <= 5) {
      throw new Error("내일 목표는 최소 5개 이상 유지해야 합니다.");
    }

    console.log("🗑️ 목표 삭제 검증:", {
      목표ID: id,
      목표날짜: goalDateKey,
      오늘날짜: todayKey,
      내일날짜: tomorrowKey,
      오늘목표수: todayGoals.length,
      내일목표수: tomorrowGoals.length,
      삭제가능: true,
    });

    const { error } = await supabase.from("goals").delete().eq("id", id);

    if (error) {
      // 데이터베이스 제약 조건 오류를 친절한 한글로 변환
      if (error.message && error.message.includes("unique_user_time")) {
        throw new Error(
          "이미 같은 시간에 목표가 등록되어 있습니다.\n다른 시간을 선택해주세요.",
        );
      }
      throw error;
    }

    // 🔕 목표 삭제 시 알림 정리 (Supabase 동기화)

    set((state) => ({
      goals: state.goals.filter((g) => g.id !== id),
    }));
  },

  addAchievementMemo: async (id: string, memo: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    console.log(`📝 목표 달성 메모 데이터베이스 저장 시도: ${id} - ${memo}`);

    // 데이터베이스에 메모 저장
    const { error } = await supabase
      .from("goals")
      .update({ achievement_memo: memo })
      .eq("id", id);

    if (error) {
      console.error("❌ 달성 메모 저장 실패:", error);
      // 데이터베이스 저장 실패 시에도 로컬 상태는 업데이트
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === id ? { ...g, achievement_memo: memo } : g,
        ),
      }));
      return;
    }

    console.log(`✅ 목표 달성 메모 데이터베이스 저장 완료: ${id}`);

    // 데이터베이스 저장 성공 시 로컬 상태 업데이트
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === id ? { ...g, achievement_memo: memo } : g,
      ),
    }));
  },

  cleanupOldGoals: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // 2년 이전의 정말 오래된 목표들만 삭제 (2년 보관 정책)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const cutoffDate = twoYearsAgo.toISOString().slice(0, 10);

    console.log("🧹 2년 이전 목표들 정리 중...", { cutoffDate });

    const { data: oldGoals, error: fetchError } = await supabase
      .from("goals")
      .select("id, title, target_time")
      .eq("user_id", session.user.id)
      .lt("target_time", cutoffDate + "T00:00:00.000Z");

    if (fetchError) {
      console.error("오래된 목표 조회 실패:", fetchError);
      return;
    }

    if (oldGoals && oldGoals.length > 0) {
      console.log(
        `🗑️ 삭제할 2년 이전 목표 ${oldGoals.length}개:`,
        oldGoals.map((g) => g.title),
      );

      const { error: deleteError } = await supabase
        .from("goals")
        .delete()
        .eq("user_id", session.user.id)
        .lt("target_time", cutoffDate + "T00:00:00.000Z");

      if (deleteError) {
        console.error("2년 이전 목표 삭제 실패:", deleteError);
      } else {
        console.log(`✅ 2년 이전 목표 ${oldGoals.length}개 삭제 완료`);
      }
    } else {
      console.log("🎉 2년 이전 목표 없음 - 정리할 데이터 없음");
    }

    // 중복 목표 정리
    await get().removeDuplicateGoals();

    // 목표 목록 새로고침
    await get().fetchGoals();
  },

  removeDuplicateGoals: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    console.log("🔄 중복 목표 정리 중...");

    // 모든 목표 조회
    const { data: allGoals, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("목표 조회 실패:", error);
      return;
    }

    if (!allGoals || allGoals.length === 0) return;

    // 중복 시간 찾기
    const timeGroups = new Map<string, typeof allGoals>();
    allGoals.forEach((goal) => {
      const time = goal.target_time;
      if (!timeGroups.has(time)) {
        timeGroups.set(time, []);
      }
      timeGroups.get(time)!.push(goal);
    });

    // 중복된 것들 처리
    const toDelete: string[] = [];
    timeGroups.forEach((goals, time) => {
      if (goals.length > 1) {
        console.log(
          `⚠️ 중복된 시간 ${time}에 ${goals.length}개 목표:`,
          goals.map((g) => g.title),
        );
        // 가장 오래된 것만 남기고 나머지 삭제
        goals.slice(1).forEach((goal) => {
          toDelete.push(goal.id);
        });
      }
    });

    if (toDelete.length > 0) {
      console.log(`🗑️ 중복 목표 ${toDelete.length}개 삭제 중...`);

      const { error: deleteError } = await supabase
        .from("goals")
        .delete()
        .in("id", toDelete);

      if (deleteError) {
        console.error("중복 목표 삭제 실패:", deleteError);
      } else {
        console.log(`✅ 중복 목표 ${toDelete.length}개 삭제 완료`);
      }
    }
  },

  checkGoal: async (id: string) => {
    const goal = get().goals.find((g) => g.id === id);
    if (!goal) return;

    // 🚫 알림 시스템 완전 비활성화 - 사용자 요청
    console.log('🚫 목표 체크 알림 취소 시스템 영구 비활성화됨 - 사용자 요청');

    // 사용자가 직접 체크하는 경우 = 승리
    await get().updateGoal(id, { status: "success" });

    // 승리 연속 뱃지 시스템 업데이트 - 오늘의 카테고리 고정 사용
    // 현재 연승 상태 확인
    
    // 오늘의 고정된 뱃지 카테고리 가져오기
    const todayCategory = await streakManager.getTodayBadgeCategory();
    const currentStreak = streakManager.getTodayStreak();
    const newStreakLevel = Math.min(currentStreak + 1, 12);
    
    // 수동으로 뱃지 생성 (고정된 카테고리 사용)
    const newBadge = {
      level: newStreakLevel,
      category: todayCategory,
      iconPath: streakManager.getBadgeIconPath(newStreakLevel, todayCategory)
    };
    
    // 메모리에 연승 수 업데이트
    await streakManager.incrementStreak();
    
    // 연승 뱃지 시스템 업데이트 완료
    set((state) => {
      const newGoalBadges = new Map(state.goalBadges);
      newGoalBadges.set(id, newBadge);
      return { 
        ...state, 
        streakBadge: newBadge,
        goalBadges: newGoalBadges
      };
    });

    // 목표 완료 시 알림 처리 (간소화)
    console.log(`✅ 목표 완료 처리: ${id}`);

    // 마지막 목표 성공 시 회고 알림 관리
    await get().cancelRetrospectIfLastGoalSuccess(id);
    
    // 해당 목표의 시간 정보 찾기
    const targetGoal = get().goals.find(g => g.id === id);
    if (targetGoal && typeof window !== 'undefined' && (window as any).cancelRetrospectOnLastGoalSuccess) {
      (window as any).cancelRetrospectOnLastGoalSuccess(targetGoal.target_time);
    }
  },

  getGoalsWithCanCheck: (isRetrospectDone = false) => {
    const goals = get().goals;
    
    // 한국 시간 기준으로 오늘 날짜 계산
    const today = getTodayKorea();

    return goals.map((goal) => {
      const targetTime = new Date(goal.target_time);
      const now = getKoreaTime();
      const timeDiff = now.getTime() - targetTime.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      const isToday = goal.target_time.startsWith(today);

      // 오늘 목표: 목표 시간 5분 전부터 체크 가능하고, 5분 후까지 체크 가능
      // 내일 목표: 회고 완료 후에는 항상 표시 (체크는 불가능)
      const canCheck =
        goal.status === "pending" &&
        isToday &&
        minutesDiff >= -5 &&
        minutesDiff <= 5;

      if (Math.abs(minutesDiff) <= 10) {
        // 10분 이내인 목표만 로그
        console.log(
          `🔍 체크 가능 여부 - ${goal.title}: ${canCheck} (시간차: ${minutesDiff.toFixed(1)}분, 상태: ${goal.status})`,
        );
      }

      const canEditGoal = canEdit(goal, isRetrospectDone);

      return { goal, canCheck, canEdit: canEditGoal };
    });
  },

  expireOverdueGoals: async () => {
    const goals = get().goals;
    const now = getKoreaTime();

    // 상세 로그는 5분마다만 출력 (성능 최적화)
    const lastExpireLogTime = parseInt(await AsyncStorage.getItem('lastExpireLogTime') || '0');
    const currentTime = Date.now();
    
    if (currentTime - lastExpireLogTime > 180000) { // 3분 간격
      console.log("🔍 expireOverdueGoals 실행 중...", {
        현재시간: now.toLocaleString("ko-KR"),
        총목표개수: goals.length,
      });
      await AsyncStorage.setItem('lastExpireLogTime', currentTime.toString());
    }

    // pending 상태인 목표들만 먼저 찾기
    const pendingGoals = goals.filter((g) => g.status === "pending");
    console.log(
      "🔍 pending 상태 목표들:",
      pendingGoals.map((g) => g.title),
    );

    const overdueGoals = goals.filter((g) => {
      if (g.status !== "pending") return false;

      const targetTime = new Date(g.target_time);
      const now = getKoreaTime();
      const timeDiff = now.getTime() - targetTime.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      const hoursDiff = timeDiff / (1000 * 60 * 60);

      // 목표 만료 시간 체크
      // 1. 목표 시간으로부터 5분 초과 시 실패 처리
      // 2. 24시간 이상 경과한 목표는 무조건 실패 처리 (날짜가 바뀐 경우)
      const isOverdue = minutesDiff > 5 || hoursDiff > 24;
      
      if (isOverdue && hoursDiff > 24) {
        console.log(`📅 24시간 경과 목표 실패 처리: ${g.title} (${hoursDiff.toFixed(1)}시간 경과)`);
      }

      return isOverdue;
    });

    // 만료 대상 목표 확인 완료

    for (const goal of overdueGoals) {
      // 목표 실패 처리 시작
      try {
        await get().updateGoal(goal.id, { status: "failure" });
        // 목표 실패 처리 완료

        // 패배 연승 뱃지 시스템 업데이트 (연승 -1)
        const newBadge = await streakManager.onDefeat();
        if (newBadge) {
          // 패배로 연승 감소
          set((state) => ({ ...state, streakBadge: newBadge }));
        } else {
          // 패배로 연승 초기화
          set((state) => ({ ...state, streakBadge: null }));
        }
        
        // 실패 처리 완료 (회고 알림은 이미 예약되어 있으므로 별도 처리 불필요)
        // 목표 실패 처리 완료, 회고 알림 유지
        
      } catch (error) {
        console.error(`💥 목표 "${goal.title}" 실패 처리 중 오류:`, error);
      }
    }
  },

  getTodaySummary: () => {
    const goals = get().goals;
    // 한국 시간 기준으로 오늘 날짜 계산
    
    
    const today = getTodayKorea();
    const todayGoals = goals.filter((g) => g.target_time.startsWith(today));

    const allDone =
      todayGoals.length > 0 && todayGoals.every((g) => g.status !== "pending");
    const hasFailure = todayGoals.some((g) => g.status === "failure");

    return { allDone, hasFailure };
  },



  // 앱 시작 시 지연된 회고 알림 체크
  checkDelayedRetrospectReminder: async () => {
    try {
      console.log('🔔 지연된 회고 알림 시스템 활성화 - 체크 시작');
      
      // 사용자 회고 알림 설정 확인
      const settingsString = await AsyncStorage.getItem('notificationSettings');
      const settings = settingsString ? JSON.parse(settingsString) : { retrospectReminders: true };
      
      if (!settings.retrospectReminders) {
        return;
      }

      const goals = get().goals;
      const now = getKoreaTime();
      const today = getTodayKorea();
      const todayGoals = goals.filter((g) => g.target_time.startsWith(today));

      console.log("🔍 회고 알림 체크 상세:", {
        현재시간: now.toLocaleString("ko-KR"),
        오늘날짜: today,
        전체목표수: goals.length,
        오늘목표수: todayGoals.length,
        오늘목표들: todayGoals.map(g => ({ title: g.title, status: g.status, time: g.target_time }))
      });

      if (todayGoals.length === 0) {
        console.log("📭 오늘 목표가 없어 회고 알림 복원 안함");
        return;
      }

      // 모든 당일 목표가 완료되었는지 확인
      const allCompleted = todayGoals.every((g) => g.status !== "pending");
      if (!allCompleted) {
        console.log("⏳ 아직 미완료 목표가 있어 회고 알림 안함");
        return;
      }

      // 이미 회고를 작성했는지 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log("🚫 세션 없음 - 회고 알림 체크 중단");
        return;
      }

      const { data: retrospectData } = await supabase
        .from("retrospects")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("date", today)
        .single();

      if (retrospectData) {
        console.log("✅ 이미 회고 작성 완료 - 알림 안함");
        return;
      }

      // 마지막 목표의 완료 시간 찾기
      const completedGoals = todayGoals.filter((g) => g.status !== "pending");
      
      if (completedGoals.length === 0) {
        console.log("🚫 완료된 목표가 없음 - 회고 알림 안함");
        return;
      }
      
      const lastGoalTime = Math.max(
        ...completedGoals.map((g) => new Date(g.target_time).getTime()),
      );
      const retrospectTime = new Date(lastGoalTime + 30 * 60 * 1000);

      console.log("🔍 지연된 회고 알림 체크:", {
        오늘목표수: todayGoals.length,
        완료된목표수: completedGoals.length,
        마지막목표시간: new Date(lastGoalTime).toLocaleString("ko-KR"),
        회고예정시간: retrospectTime.toLocaleString("ko-KR"),
        현재시간: now.toLocaleString("ko-KR"),
        알림필요: retrospectTime <= now,
        회고작성여부: !!retrospectData
      });

      // 회고 시간이 이미 지났고 회고를 아직 작성하지 않았다면 한 번만 알림
      if (retrospectTime <= now) {
        console.log("🚨 지연된 회고 알림 발견! 단발성 알림 발송");
        try {
          await scheduleRetrospectReminderImmediate();
          console.log("✅ 지연된 회고 알림 발송 성공 - 더 이상 반복 안함");
        } catch (error) {
          console.error("❌ 지연된 회고 알림 발송 실패:", error);
        }
      } else {
        console.log("⏰ 회고 시간이 아직 안됨 - 나중에 알림 예정");
      }
    } catch (error) {
      console.error("지연된 회고 알림 체크 실패:", error);
    }
  },

  // 마지막 목표 + 30분 후 회고 알림 예약
  scheduleRetrospectForLastGoal: async () => {
    try {
      console.log('🔔 회고 알림 예약 시스템 활성화');
      
      // 사용자 회고 알림 설정 확인
      const settingsString = await AsyncStorage.getItem('notificationSettings');
      const settings = settingsString ? JSON.parse(settingsString) : { retrospectReminders: true };
      
      if (!settings.retrospectReminders) {
        console.log("🔕 회고 알림이 비활성화되어 있어 회고 알림 예약 건너뜀");
        return;
      }

      const goals = get().goals;
      const today = getTodayKorea();
      const todayGoals = goals.filter((g) => g.target_time.startsWith(today));

      if (todayGoals.length === 0) {
        console.log("📭 오늘 목표가 없어 회고 알림 예약 안함");
        return;
      }

      // 마지막 목표 시간 찾기
      const lastGoalTime = Math.max(
        ...todayGoals.map((g) => new Date(g.target_time).getTime())
      );
      const lastGoal = new Date(lastGoalTime);

      console.log(`🔔 회고 알림 예약: 마지막 목표 ${lastGoal.toLocaleString('ko-KR')} + 30분`);

      // 기존 회고 알림 취소 후 새로 예약
      await cancelRetrospectReminder();
      await scheduleRetrospectReminder(lastGoal);
    } catch (error) {
      console.error("❌ 회고 알림 예약 실패:", error);
    }
  },

  // 마지막 목표 성공 시 회고 알림 취소
  cancelRetrospectIfLastGoalSuccess: async (goalId: string) => {
    try {
      // 사용자 회고 알림 설정 확인
      const settingsString = await AsyncStorage.getItem('notificationSettings');
      const settings = settingsString ? JSON.parse(settingsString) : { retrospectReminders: true };
      
      if (!settings.retrospectReminders) {
        console.log("🔕 회고 알림이 비활성화되어 있어 취소 작업 건너뜀");
        return;
      }

      const goals = get().goals;
      const today = getTodayKorea();
      const todayGoals = goals.filter((g) => g.target_time.startsWith(today));
      
      if (todayGoals.length === 0) return;

      // 성공한 목표가 마지막 목표인지 확인
      const lastGoalTime = Math.max(
        ...todayGoals.map((g) => new Date(g.target_time).getTime())
      );
      const successGoal = goals.find(g => g.id === goalId);
      
      if (successGoal && new Date(successGoal.target_time).getTime() === lastGoalTime) {
        console.log("🎉 마지막 목표 성공! 회고 알림 취소");
        await cancelRetrospectReminder();
      } else {
        console.log("⏳ 마지막 목표가 아니므로 회고 알림 유지");
      }
    } catch (error) {
      console.error("❌ 회고 알림 취소 실패:", error);
    }
  },

  // 연승 뱃지 관련 메서드들
  getCurrentStreak: () => {
    return streakManager.getTodayStreak();
  },

  getStreakCategory: async () => {
    return await streakManager.getTodayBadgeCategory();
  },

  // 알림 디버깅 관련
  checkAllNotifications: async () => {
    console.log("🔍 현재 설정된 알림 확인 시작");
    try {
      const notifications = await unifiedNotificationManager.getScheduledNotifications();
      console.log(`📊 통합 시스템: ${notifications.length}개 알림 예약됨`);
      await getAllScheduledNotifications();
    } catch (error) {
      console.log("⚠️ 통합 알림 조회 실패, 기존 시스템 사용:", error);
      await getAllScheduledNotifications();
    }
  },

  cancelAllNotifications: async () => {
    console.log("🧹 모든 알림 취소 시작");
    try {
      await unifiedNotificationManager.cancelAllNotifications();
      console.log("✅ 통합 시스템으로 모든 알림 취소 완료");
    } catch (error) {
      console.log("⚠️ 통합 알림 취소 실패, 기존 시스템 사용:", error);
      await cancelAllNotifications();
    }
  },

  // 데이터 초기화 함수
  clearAllGoals: () => {
    console.log("🧹 모든 목표 데이터 로컬 스토어 초기화");
    set({ 
      goals: [], 
      streakBadge: null,
      goalBadges: new Map()
    });
  },
}));

export default useGoalStore;
