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
// 알림 시스템 완전 비활성화됨 (Expo Go SDK 53 제한)

// 알림 시스템 완전 비활성화됨
const cancelAllScheduledAlarms = async () => {
  console.log('🔕 알림 시스템 비활성화됨');
};
// 삭제된 모듈: smartNotificationSystem
import { streakManager, StreakBadge } from "../utils/streakBadgeSystem";
import { syncOnUserAction } from "../utils/smartSyncManager";
import { scheduleGoalAlarm, cancelGoalAlarm, scheduleRetrospectReminderImmediate, cancelRetrospectReminder } from "../utils/notificationScheduler";

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

  // 🔥 내일 이후 목표: 항상 편집 가능 (회고 완료 여부와 무관)
  if (goalDateKey >= tomorrowKey) {
    console.log("✅ 내일 이후 목표 편집 가능:", {
      목표제목: g.title,
      목표날짜: goalDateKey,
      내일날짜: tomorrowKey,
      회고완료여부: isRetrospectDone
    });
    return true;
  }

  // 🔥 당일 목표 처리
  if (goalDateKey === todayKey) {
    console.log("🔍 당일 목표 편집 검사:", {
      목표제목: g.title,
      회고완료: isRetrospectDone,
      당일여부: true
    });
    
    // 회고 완료 후에는 편집 불가
    if (isRetrospectDone) {
      console.log("❌ 회고 완료 후 당일 목표 편집 불가:", g.title);
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
  cancelAllNotifications: () => void;
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
        isAnonymous: session?.user?.is_anonymous
      });
      
      if (!session) {
        console.log("🚫 세션 없음 - 목표 가져오기 중단");
        set({ goals: [] });
        return;
      }
    
    console.log("✅ 세션 확인 완료 - 목표 가져오기 계속 진행");
    
    console.log("🔍 목표 가져오기 시작");
    console.log("🔍 사용자 정보:", {
      is_anonymous: session.user.is_anonymous
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

    console.log("🔍 데이터베이스 쿼리 범위:", {
      twoYearsAgo: twoYearsAgo + "T00:00:00.000Z",
      twoYearsLater: twoYearsLater + "T23:59:59.999Z"
    });

      // 게스트와 인증 사용자 모두를 위한 안전한 쿼리
      console.log("🔍 데이터베이스 쿼리 실행");
      
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

      // 개별 목표 뱃지 복원 (한국 시간 기준으로 오늘 성공한 목표들을 시간순으로 정렬)
      const finalGoals = get().goals;
      const todaySuccessGoals = finalGoals?.filter(g => {
        const goalDate = new Date(g.target_time);
        const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
        const koreanDateKey = koreanDate.toISOString().slice(0, 10);
        return koreanDateKey === today && g.status === 'success';
      }).sort((a, b) => new Date(a.target_time).getTime() - new Date(b.target_time).getTime()) || [];
    
    console.log(`🏆 오늘 성공한 목표 ${todaySuccessGoals.length}개의 뱃지 복원 중...`);
    
    const restoredBadges = new Map<string, StreakBadge>();
    
    // ⭐ 중요: 오늘의 뱃지 카테고리를 한 번만 가져와서 모든 목표에 동일하게 적용
    const todayBadgeCategory = await streakManager.getTodayBadgeCategory();
    console.log(`🔒 오늘의 뱃지 카테고리 고정: ${todayBadgeCategory}`);
    
    // 연속 승리 카운터 (실시간 계산)
    let consecutiveWins = 0;
    
      // 오늘의 모든 목표를 시간순으로 정렬 (한국 시간 기준)
      const todayAllGoals = finalGoals?.filter(g => {
        const goalDate = new Date(g.target_time);
        const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
        const koreanDateKey = koreanDate.toISOString().slice(0, 10);
        return koreanDateKey === today;
      }).sort((a, b) => new Date(a.target_time).getTime() - new Date(b.target_time).getTime()) || [];
    
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
    // 날짜별 목표 개수 (한국 시간 기준)
    const getGoalCountByDate = (targetDate: string) => {
      return data?.filter((g: Goal) => {
        const goalDate = new Date(g.target_time);
        const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
        const koreanDateKey = koreanDate.toISOString().slice(0, 10);
        return koreanDateKey === targetDate;
      }).length || 0;
    };

    console.log("📅 날짜별 목표 개수:", {
      "2년전": getGoalCountByDate(twoYearsAgo),
      오늘: getGoalCountByDate(today),
      "2년후": getGoalCountByDate(twoYearsLater),
    });

    // 오늘 수행 목표 상세 정보 로그 (한국 시간 기준)
    const todayGoals = data?.filter((g: Goal) => {
      const goalDate = new Date(g.target_time);
      const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
      const koreanDateKey = koreanDate.toISOString().slice(0, 10);
      return koreanDateKey === today;
    }) || [];
    console.log(
      "🔍 오늘 수행 목표 상세 (DB에서 가져온 것):",
      todayGoals.map((g: Goal) => ({
        title: g.title,
        time: g.target_time,
        status: g.status,
      })),
    );

    console.log("💾 goalStore 상태 업데이트:", {
      이전개수: get().goals.length,
      새로운개수: data?.length || 0,
      데이터: data?.map((g: Goal) => ({ title: g.title, time: g.target_time })) || [],
    });

      // 복원된 개별 뱃지들을 상태에 저장
      set((state) => ({ ...state, goalBadges: restoredBadges }));
      
      console.log(`🏆 개별 수행 목록 뱃지 복원 완료: ${restoredBadges.size}개`);

      // 사용자 알림 설정 확인
      const settingsString = await AsyncStorage.getItem('notificationSettings');
      const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true };
      
      if (settings.goalAlarms) {
        // 🚫 알림 스케줄링 완전 비활성화 - 즉시 발송 방지
        // fetchGoals는 데이터 로드용이므로 알림 스케줄링 하지 않음
        const finalGoalsForAlarm = get().goals;
        
        // 1. 완료/실패한 수행 목록들의 알림 자동 취소만 수행 (DB 상태 기반)
        const completedGoals = finalGoalsForAlarm.filter(
          goal => goal.status === 'success' || goal.status === 'failure'
        );
        
        if (completedGoals.length > 0) {
          if (__DEV__) console.log(`🔕 DB에서 완료/실패 상태인 수행 목록 ${completedGoals.length}개 알림 취소 중...`);
          for (const goal of completedGoals) {
            try {
              // 알림 시스템 비활성화됨
            } catch (error) {
              if (__DEV__) console.log(`⚠️ 수행 목록 "${goal.title}" 알림 취소 실패:`, error);
            }
          }
        }

        // 2. pending 상태 목표 카운트만 확인 (알림 재설정 안함)
        const activeGoals = finalGoalsForAlarm.filter(
          goal => goal.status === 'pending' && new Date(goal.target_time) > new Date()
        );

        if (__DEV__) console.log(`📊 DB 상태 기반 분석: 완료/실패 ${completedGoals.length}개, 활성 ${activeGoals.length}개`);

        // 🚫 fetchGoals에서는 알림 재스케줄링 안함 (앱 시작/포그라운드 복귀 시 스팸 방지)
        // 알림은 목표 생성/수정 시에만 스케줄링됨
        if (__DEV__) console.log(`📊 활성 목표 ${activeGoals.length}개 확인됨 (알림 재스케줄링은 안함)`);
        if (__DEV__) console.log('🔄 목표 로드 완료 - 회고 알림 시스템 준비');
      } else {
        if (__DEV__) console.log("🔕 목표 알림이 비활성화되어 있어 스케줄링 건너뜀");
      }
      
      // 회고 알림은 목표 추가/완료 시에만 실행 (fetchGoals에서는 실행하지 않음)
      
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

    // 게스트 사용자 프로필 확인 및 생성
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      console.log("🔧 게스트 사용자 프로필 자동 생성 중...");
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          display_name: `게스트${Math.random().toString(36).substr(2, 4)}`,
          created_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error("❌ 프로필 생성 실패:", profileError);
        throw new Error("프로필 생성에 실패했습니다. 다시 시도해주세요.");
      }
      console.log("✅ 게스트 사용자 프로필 생성 완료");
    }

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
    const nowKoreaValidation = getKoreaTime();
    
    // 한국 시간 기준으로 당일 여부 판단
    const todayKorea = getTodayKorea();
    const targetDateKorea = formatDateKorea(targetDate);
    const isToday = targetDateKorea === todayKorea;
    
    console.log("🔍 3시간 제약 검증:", {
      목표시간: targetDate.toLocaleString('ko-KR'),
      현재한국시간: nowKoreaValidation.toLocaleString('ko-KR'),
      목표날짜키: targetDateKorea,
      오늘날짜키: todayKorea,
      당일여부: isToday
    });
    
    if (isToday) {
      const threeHoursFromNow = new Date(nowKoreaValidation.getTime() + 3 * 60 * 60 * 1000);
      if (targetDate < threeHoursFromNow) {
        const currentTimeStr = nowKoreaValidation.toLocaleTimeString('ko-KR', {
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
      console.log("✅ 내일 이후 목표이므로 3시간 제약 건너뜀 - 시간 제약 없음");
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
      
      // 외래키 제약 조건 위반 처리 (프로필이 없는 경우)
      if (error.code === '23503' && error.message.includes('goals_user_id_fkey')) {
        console.error("❌ 외래키 제약 조건 위반 - 프로필 누락:", {
          사용자ID: session.user.id,
          에러코드: error.code,
          에러메시지: error.message
        });
        
        // 프로필 재생성 시도
        try {
          console.log("🔧 프로필 재생성 시도...");
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              display_name: `게스트${Math.random().toString(36).substr(2, 4)}`,
              created_at: new Date().toISOString()
            });
          
          if (profileError) {
            console.error("❌ 프로필 재생성 실패:", profileError);
            throw new Error("회원 정보 설정에 문제가 있습니다.\n앱을 다시 시작하거나 로그아웃 후 다시 로그인해주세요.");
          }
          
          console.log("✅ 프로필 재생성 완료 - 목표 다시 저장 시도");
          
          // 프로필 생성 후 목표 다시 저장
          const { error: retryError } = await supabase.from("goals").insert([row]);
          if (retryError) {
            console.error("❌ 목표 재저장 실패:", retryError);
            throw new Error("목표 저장에 실패했습니다. 다시 시도해주세요.");
          }
          
          console.log("✅ 프로필 재생성 후 목표 저장 성공");
        } catch (retryError) {
          console.error("❌ 프로필 재생성 과정 실패:", retryError);
          throw new Error("회원 정보 문제로 목표를 저장할 수 없습니다.\n앱을 재시작하거나 로그아웃 후 다시 로그인해주세요.");
        }
      } else {
        console.error("❌ 목표 저장 실패:", {
          에러코드: error.code,
          에러메시지: error.message,
          사용자ID: session.user.id
        });
        throw new Error("목표 저장에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.");
      }
    }

    set((state) => ({
      goals: [...state.goals, row].sort(
        (a, b) =>
          new Date(a.target_time).getTime() - new Date(b.target_time).getTime(),
      ),
    }));

    // 알림 설정 확인 후 스케줄링 - 즉시 발송 방지
    const settingsString = await AsyncStorage.getItem('notificationSettings');
    const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true };
    
    // ✅ 한국 시간 기준으로 정확한 알림 스케줄링
    const targetTime = new Date(row.target_time);
    const nowKorea = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const targetKorea = new Date(targetTime.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    
    if (settings.goalAlarms && targetKorea > nowKorea) {
      if (__DEV__) console.log("🔔 목표 알림 스케줄링 (한국시간):", {
        목표: row.title,
        UTC설정시간: targetTime.toISOString(),
        한국목표시간: targetKorea.toLocaleString('ko-KR'),
        한국현재시간: nowKorea.toLocaleString('ko-KR'),
        미래여부: targetKorea > nowKorea
      });
      await scheduleGoalAlarm(row.id, row.title, targetTime);
      
      // 디버깅용 - 알림 스케줄링 후 즉시 확인
      console.log("🔍 목표 추가 후 알림 확인 완료");
    } else if (targetKorea <= nowKorea) {
      if (__DEV__) console.log("⏰ 목표 시간이 이미 지나서 알림 설정 안함 (한국시간 기준)");
    } else {
      if (__DEV__) console.log("🔕 목표 알림이 비활성화되어 있어 알림 건너뜀");
    }

    // 🚫 회고 알림 중복 실행 방지 (목표 추가 시에만 실행)
    console.log("🚫 단일 목표 추가 - 회고 알림 스케줄링 안함");
    
    console.log("⏰ 목표 추가 완료:", row.title, "at", row.target_time);
    
    // 스마트 동기화 - 목표 생성 시 즉시 동기화
    await syncOnUserAction('goal_create', { goalId: row.id, title: row.title });
  },

  addGoalsBatch: async (rows: { title: string; target_time: string }[]) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    // 게스트 사용자 프로필 확인 및 생성
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      console.log("🔧 게스트 사용자 프로필 자동 생성 중...");
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          display_name: `게스트${Math.random().toString(36).substr(2, 4)}`,
          created_at: new Date().toISOString()
        });
      
      if (profileError) {
        console.error("❌ 프로필 생성 실패:", profileError);
        throw new Error("프로필 생성에 실패했습니다. 다시 시도해주세요.");
      }
      console.log("✅ 게스트 사용자 프로필 생성 완료");
    }

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
      
      // 외래키 제약 조건 위반 처리 (배치 저장 시)
      if (error.code === '23503' && error.message.includes('goals_user_id_fkey')) {
        console.error("❌ 배치 저장 시 외래키 제약 조건 위반 - 프로필 누락:", {
          사용자ID: session.user.id,
          에러코드: error.code,
          에러메시지: error.message,
          목표개수: goals.length
        });
        
        // 프로필 재생성 시도
        try {
          console.log("🔧 배치 저장용 프로필 재생성 시도...");
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              display_name: `게스트${Math.random().toString(36).substr(2, 4)}`,
              created_at: new Date().toISOString()
            });
          
          if (profileError) {
            console.error("❌ 배치 저장용 프로필 재생성 실패:", profileError);
            throw new Error("회원 정보 설정에 문제가 있습니다.\n앱을 다시 시작하거나 로그아웃 후 다시 로그인해주세요.");
          }
          
          console.log("✅ 배치 저장용 프로필 재생성 완료 - 목표들 다시 저장 시도");
          
          // 프로필 생성 후 목표들 다시 저장
          const { error: retryError } = await supabase.from("goals").insert(goals);
          if (retryError) {
            console.error("❌ 배치 목표 재저장 실패:", retryError);
            throw new Error("목표 저장에 실패했습니다. 다시 시도해주세요.");
          }
          
          console.log("✅ 프로필 재생성 후 배치 목표 저장 성공");
        } catch (retryError) {
          console.error("❌ 배치 저장 프로필 재생성 과정 실패:", retryError);
          throw new Error("회원 정보 문제로 목표를 저장할 수 없습니다.\n앱을 재시작하거나 로그아웃 후 다시 로그인해주세요.");
        }
      } else {
        console.error("❌ 배치 목표 저장 실패:", {
          에러코드: error.code,
          에러메시지: error.message,
          사용자ID: session.user.id,
          목표개수: goals.length
        });
        throw new Error("목표 저장에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.");
      }
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

    // ✅ 알림 시스템 재활성화
    const settingsString = await AsyncStorage.getItem('notificationSettings');
    const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true, retrospectReminders: true };
    
    if (settings.goalAlarms) {
      console.log('🔔 새 목표 알림 동기화 활성화됨');
      
      for (const goal of goals) {
        try {
          const targetTime = new Date(goal.target_time);
          const nowKorea = getKoreaTime();
          
          if (targetTime > nowKorea) {
            await scheduleGoalAlarm(goal.id, goal.title, targetTime);
            if (__DEV__) console.log(`✅ 배치 목표 "${goal.title}" 알림 스케줄링 완료`);
          }
        } catch (error) {
          if (__DEV__) console.log(`⚠️ 배치 목표 "${goal.title}" 알림 스케줄링 실패:`, error);
        }
      }
    }

    // 🚫 배치 목표 추가 시에도 회고 알림 중복 방지
    console.log('🚫 배치 목표 추가 - 회고 알림 스케줄링 안함');
    
    console.log("🔄 배치 목표 추가 완료 - 알림 시스템 활성화됨");
    
    // 스마트 동기화 - 배치 목표 생성 시 즉시 동기화
    await syncOnUserAction('goal_create', { goalCount: goals.length, type: 'batch' });
  },

  updateGoal: async (id: string, data: Partial<Goal>) => {
    // 시간 변경 시 3시간 제약 및 30분 범위 중복 검증
    if (data.target_time) {
      // 3시간 제약 검증 (당일 목표인 경우) - 한국 시간 기준
      const targetDate = new Date(data.target_time);
      const nowKorea = getKoreaTime();
      
      // 한국 시간 기준으로 당일 여부 판단
      const todayKorea = getTodayKorea();
      const targetDateKorea = formatDateKorea(targetDate);
      const isToday = targetDateKorea === todayKorea;
      
      console.log("🔍 목표 편집 시 3시간 제약 검증:", {
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
        console.log("✅ 내일 이후 목표이므로 3시간 제약 건너뜀 - 시간 제약 없음");
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
    // 알림 시스템 비활성화됨

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
        
        // 🚫 목표 수정 시 알림 스팸 방지 - 10분 후 목표만 재스케줄링
        if (settings.goalAlarms) {
          const targetTime = new Date(updatedGoal.target_time);
          const nowKorea = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
          const timeDifferenceMinutes = (targetTime.getTime() - nowKorea.getTime()) / (1000 * 60);
          
          if (timeDifferenceMinutes > 10) {
            console.log("🔔 목표 수정으로 알림 재스케줄링 (10분 후 목표만)");
            await cancelGoalAlarm(id);
            await scheduleGoalAlarm(id, updatedGoal.title, targetTime);
          } else {
            console.log(`🚫 목표 수정 시 알림 스팸 방지 - 목표까지 ${Math.round(timeDifferenceMinutes)}분 남아서 알림 설정 안함`);
          }
        } else {
          console.log("🔕 목표 알림이 비활성화되어 있어 스케줄링 건너뜀");
        }
        
        // 🚫 목표 수정 시 회고 알림 중복 실행 방지 (새 목표 추가시에만 실행)
      }
    }

    // 🚫 목표 시간 수정 시 회고 알림 중복 방지

    // 목표 상태 변경 로그
    if (data.status) {
      console.log(`🔄 목표 상태 변경 감지: ${id} → ${data.status}`);
    }
    
    // 스마트 동기화 - 목표 수정 시 즉시 동기화
    const actionType = data.status === 'success' || data.status === 'failure' ? 'goal_complete' : 'goal_update';
    await syncOnUserAction(actionType, { goalId: id, changes: data });
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

    if (__DEV__) console.log("🗑️ 목표 삭제 검증:", {
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
    await cancelGoalAlarm(id);

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
        oldGoals.map((g: any) => g.title),
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
    const timeGroups = new Map<string, any[]>();
    allGoals.forEach((goal: any) => {
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
          goals.map((g: any) => g.title),
        );
        // 가장 오래된 것만 남기고 나머지 삭제
        goals.slice(1).forEach((goal: any) => {
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
    if (!goal) {
      console.error('❌ checkGoal: 목표를 찾을 수 없음:', id);
      return;
    }

    console.log('🎯 목표 체크 시작:', { id, title: goal.title, status: goal.status });

    // 알림 취소
    // 알림 시스템 비활성화됨

    // 🔥 APK 정확한 상태 전환 시스템
    try {
      const { error } = await supabase
        .from('goals')
        .update({ status: 'success' })
        .eq('id', id);

      if (error) {
        console.error('❌ DB 상태 업데이트 실패:', error);
        throw error;
      }

      // 로컬 상태 즉시 업데이트
      set(state => ({
        goals: state.goals.map(g => 
          g.id === id ? { ...g, status: 'success' as const } : g
        )
      }));

      console.log('✅ 목표 상태 success로 변경 완료:', id);
    } catch (error) {
      console.error('❌ checkGoal 실패:', error);
      throw error;
    }

    // 승리 연속 뱃지 시스템 업데이트 - 오늘의 카테고리 고정 사용
    console.log('🏆 뱃지 생성 시작:', { goalId: id, goalTitle: goal.title });
    
    try {
      // 오늘의 고정된 뱃지 카테고리 가져오기
      const todayCategory = await streakManager.getTodayBadgeCategory();
      const currentStreak = streakManager.getTodayStreak();
      const newStreakLevel = Math.min(currentStreak + 1, 12);
      
      console.log('🏆 뱃지 데이터 준비:', {
        todayCategory,
        currentStreak,
        newStreakLevel
      });
      
      // 수동으로 뱃지 생성 (고정된 카테고리 사용)
      const newBadge = {
        level: newStreakLevel,
        category: todayCategory,
        iconPath: streakManager.getBadgeIconPath(newStreakLevel, todayCategory)
      };
      
      console.log('🏆 생성된 뱃지:', newBadge);
      
      // 메모리에 연승 수 업데이트
      await streakManager.incrementStreak();
      
      // 연승 뱃지 시스템 업데이트 완료
      set((state) => {
        const newGoalBadges = new Map(state.goalBadges);
        newGoalBadges.set(id, newBadge);
        console.log('🏆 뱃지 저장:', {
          goalId: id,
          badgeMapSize: newGoalBadges.size,
          savedBadge: newGoalBadges.get(id)
        });
        return { 
          ...state, 
          streakBadge: newBadge,
          goalBadges: newGoalBadges
        };
      });
      
      console.log('✅ 뱃지 시스템 업데이트 완료:', id);
    } catch (error) {
      console.error('❌ 뱃지 생성 실패:', error);
    }

    // 목표 완료 시 알림 처리 (간소화)
    console.log(`✅ 목표 완료 처리: ${id}`);

    // 목표 완료 시 해당 목표의 알림 취소
    await cancelGoalAlarm(id);

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
      // 한국 시간 기준으로 오늘인지 확인
      const goalDate = new Date(goal.target_time);
      const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
      const koreanDateKey = koreanDate.toISOString().slice(0, 10);
      const isToday = koreanDateKey === today;

      // 🎯 "완벽보다 시작" 철학: ±5분 확인 창구  
      // 오늘 날짜의 목표만, 목표 시간 5분 전부터 5분 후까지만 확인 가능
      const canCheck =
        goal.status === "pending" &&
        isToday &&
        minutesDiff >= -5 &&
        minutesDiff <= 5; // ±5분 확인 창구

      if (Math.abs(minutesDiff) <= 1440 || Math.abs(minutesDiff) <= 10) {
        // 24시간 이내이거나 10분 이내인 목표 로그
        console.log(
          `🔍 체크 가능 여부 - ${goal.title}: ${canCheck} (시간차: ${minutesDiff.toFixed(1)}분, 상태: ${goal.status})`,
        );
      }

      const canEditGoal = canEdit(goal, isRetrospectDone);

      // 디버깅: canEdit 계산 결과 로그
      if (goal.status === "pending") {
        console.log(`🔧 canEdit 계산 - ${goal.title}:`, {
          canEdit: canEditGoal,
          status: goal.status,
          targetTime: goal.target_time,
          isRetrospectDone: isRetrospectDone,
          goalDateKey: formatDateKorea(new Date(goal.target_time))
        });
      }

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

      // 🎯 "완벽보다 시작" 철학: ±5분 확인 창구
      // 목표 시간 5분 후 경과하면 '패배' 처리 (자동 만료)
      const isOverdue = minutesDiff > 5;
      
      if (isOverdue) {
        console.log(`📅 5분 경과 목표 패배 처리: ${g.title} (${minutesDiff.toFixed(1)}분 경과)`);
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
    // 🚫 지연된 회고 알림도 완전 차단 - 알림 스팸 방지
    console.log('🚫 지연된 회고 알림 체크 시스템 완전 비활성화 (알림 스팸 방지)');
    return;
  },

  // 마지막 목표 + 30분 후 회고 알림 예약
  scheduleRetrospectForLastGoal: async () => {
    const settingsString = await AsyncStorage.getItem('notificationSettings');
    const settings = settingsString ? JSON.parse(settingsString) : { retrospectReminders: true };
    
    if (!settings.retrospectReminders) {
      console.log('🔕 회고 알림이 비활성화되어 있어 스케줄링 건너뜀');
      return;
    }

    const goals = get().goals;
    const today = getTodayKorea();
    const todayGoals = goals.filter((g) => g.target_time.startsWith(today));
    
    if (todayGoals.length === 0) return;

    // 가장 늦은 목표 시간 찾기
    const lastGoalTime = Math.max(
      ...todayGoals.map((g) => new Date(g.target_time).getTime())
    );

    // 마지막 목표 완료 30분 후에 회고 알림 스케줄링
    const reminderTime = new Date(lastGoalTime + 30 * 60 * 1000);
    const nowKorea = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    
    if (reminderTime > nowKorea) {
      await scheduleRetrospectReminderImmediate();
      console.log(`📝 회고 알림 예약: ${reminderTime.toLocaleString('ko-KR')}`);
    } else {
      console.log('⏰ 회고 알림 시간이 이미 지나서 설정 안함');
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
    console.log("🔕 알림 시스템 비활성화됨");
  },

  cancelAllNotifications: () => {
    console.log("🔕 알림 시스템 비활성화됨");
  },

  // 이미 완료된 목표들에 대해 뱃지 강제 생성
  createMissingBadges: async () => {
    console.log("🏆 누락된 뱃지 생성 시작");
    
    const { goals, goalBadges } = get();
    const successGoals = goals.filter(g => g.status === 'success');
    
    console.log("🏆 완료된 목표들:", {
      전체목표: goals.length,
      완료목표: successGoals.length,
      기존뱃지: goalBadges.size
    });
    
    for (const goal of successGoals) {
      if (!goalBadges.has(goal.id)) {
        console.log("🏆 뱃지 생성:", goal.title);
        
        try {
          const todayCategory = await streakManager.getTodayBadgeCategory();
          const currentStreak = streakManager.getTodayStreak();
          const newStreakLevel = Math.min(currentStreak + 1, 12);
          
          const newBadge = {
            level: newStreakLevel,
            category: todayCategory,
            iconPath: streakManager.getBadgeIconPath(newStreakLevel, todayCategory)
          };
          
          set((state) => {
            const newGoalBadges = new Map(state.goalBadges);
            newGoalBadges.set(goal.id, newBadge);
            return { 
              ...state, 
              goalBadges: newGoalBadges
            };
          });
          
          await streakManager.incrementStreak();
          console.log("✅ 뱃지 생성 완료:", goal.title);
        } catch (error) {
          console.error("❌ 뱃지 생성 실패:", error);
        }
      }
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
