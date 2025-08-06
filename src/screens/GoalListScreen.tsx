// src/screens/GoalListScreen.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Alert,
  AppState,
  Button,
  SectionList,
  SectionListData,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  Image,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import useGoalStore, { Goal } from "../store/goalStore";
import useProfileStore from "../store/profileStore";
import useRetrospectStore from "../store/retrospectStore";
import useCommunityStore from "../store/communityStore";
import { useFlexibleGoalStore } from "../store/flexibleGoalStore";
import { useAppLifecycle } from "../hooks/useAppLifecycle";
import { registerGlobalDebugFunctions } from "../utils/globalDebugFunctions";

import { getTodayKorea, getTomorrowKorea } from "../utils/timeUtils";
import { getBadgeImage } from "../utils/badgeImageMap";
import { DailyStreakManager } from "../utils/streakBadgeSystem";
// 스타일 상수 제거
import UIButton from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Ionicons } from "@expo/vector-icons";

/* ───── 날짜 유틸 ───── */
const ymd = (d: Date | string) =>
  (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
// 실시간으로 날짜 계산 (컴포넌트 렌더링 시마다 갱신)
const getCurrentDateKeys = () => {
  // 강제로 현재 한국 시간 계산
  const now = new Date();
  const koreaOffset = 9 * 60; // KST는 UTC+9
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const koreaTime = new Date(utcTime + koreaOffset * 60000);

  const todayKey = koreaTime.toISOString().slice(0, 10);
  const tomorrowKey = new Date(koreaTime.getTime() + 86400000)
    .toISOString()
    .slice(0, 10);

  return { todayKey, tomorrowKey };
};

/* ───── 타입 ───── */
interface GoalSection {
  title: string;
  data: { goal: Goal; canCheck: boolean; canEdit: boolean }[];
}

/* ─────────────────────────────────────── */
// 타입 정의
type RootStackParamList = {
  GoalList: undefined;
  GoalDetail: { goalId: string };
  GoalBatch: { initial?: string };
  TimeSelect: { initial?: string };
  Retrospect: undefined;
  FlexibleGoal: { targetDate: string };
};

type GoalListScreenNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export default function GoalListScreen({ navigation: navProp, route }: any) {
  // GoalListScreen 컴포넌트 렌더링

  // useNavigation hook을 사용하여 더 안정적인 navigation 참조
  const navigation = useNavigation() as any;

  // 신규 사용자 첫 방문 체크
  const isFirstTimeUser = route?.params?.firstTimeUser;

  // Navigation 객체 상태 확인

  /* store */
  const {
    goals,
    fetchGoals: fetchGoalsOriginal,
    checkGoal,
    expireOverdueGoals,
    getGoalsWithCanCheck,
    cleanupOldGoals,
    addAchievementMemo,
    getCurrentStreak,
    getStreakCategory,
    streakBadge,
    goalBadges,
    checkAllNotifications,
    cancelAllNotifications,
  } = useGoalStore();

  // fetchGoals 래퍼 함수로 디버깅 및 오류 처리 강화
  const fetchGoals = async () => {
    // 목표 데이터 가져오기 시도
    try {
      await fetchGoalsOriginal();
      // 목표 데이터 로드 완료
    } catch (error) {
      console.error("❌ fetchGoalsOriginal 실행 오류:", error);

      // 네트워크 관련 오류 구분
      const isNetworkError =
        error instanceof TypeError &&
        (error.message.includes("Network request failed") ||
          error.message.includes("fetch"));

      const errorMessage = isNetworkError
        ? "인터넷 연결을 확인하고 다시 시도해주세요."
        : "목표 목록을 불러오는 중 문제가 발생했습니다. 앱을 새로고침하거나 다시 시도해주세요.";

      // 오류 발생 시 사용자에게 알림 표시
      Alert.alert("목표 불러오기 실패", errorMessage, [
        { text: "다시 시도", onPress: () => fetchGoals() },
        { text: "확인", style: "cancel" },
      ]);
    }
  };
  const { profile, updateDream, fetchProfile } = useProfileStore();
  const { todayRetrospectExists, fetchToday } = useRetrospectStore();
  const {
    myResolution,
    fetchMyResolution,
    saveMyResolution: saveResolution,
    updateMyResolution,
    deleteMyResolution,
  } = useCommunityStore();
  const {
    goals: flexibleGoals,
    fetchGoals: fetchFlexibleGoals,
    checkGoal: checkFlexibleGoal,
    getTomorrowGoals: getTomorrowFlexibleGoals,
    hasTodayGoal: hasFlexibleTodayGoal,
    hasTomorrowGoal: hasFlexibleTomorrowGoal,
  } = useFlexibleGoalStore();

  // 📱 앱 생명주기 관리 - 스마트 알림 제어
  const { isActive } = useAppLifecycle();

  /* 꿈 편집 상태 */
  const [isEditingDream, setIsEditingDream] = useState(false);
  const [dreamText, setDreamText] = useState("");

  /* 각오 편집 상태 */
  const [isWritingResolution, setIsWritingResolution] = useState(false);
  const [resolutionText, setResolutionText] = useState("");
  const [isResolutionExpanded, setIsResolutionExpanded] = useState(false);

  /* 메모 관련 상태 */
  const [memoModalVisible, setMemoModalVisible] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState("");

  /* 당겨서 새로고침 상태 */
  const [refreshing, setRefreshing] = useState(false);

  /* ───── 신규 사용자 첫 목표 작성 자동 이동 ───── */
  useEffect(() => {
    const params = route?.params as any;
    const isFirstTimeUser = params?.firstTimeUser;

    if (isFirstTimeUser && navigation) {
      console.log("🎯 신규 사용자 감지 - 내일 목표 작성으로 자동 이동");
      // 약간의 지연 후 자동 이동 (UI 안정화)
      const timer = setTimeout(() => {
        navigation.navigate("GoalBatch", { initial: "tomorrow" });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [route?.params, navigation]);

  /* ───── 초기화 ───── */
  useEffect(() => {
    const handleAppActive = (state: string) => {
      if (state === "active") {
        fetchGoals();
        // cleanupOldGoals(); // 2년 보관 정책으로 인해 비활성화
        expireOverdueGoals();
        fetchMyResolution();
        fetchToday();
        fetchProfile();
      }
    };
    const subscription = AppState.addEventListener("change", handleAppActive);

    // 초기 실행
    console.log("🚀 GoalListScreen에서 fetchGoals 호출 시작");
    fetchGoals().catch((err) => console.error("❌ fetchGoals 오류:", err));
    // cleanupOldGoals(); // 2년 보관 정책으로 인해 비활성화
    expireOverdueGoals();
    // 회고 알림 시스템이 goalStore에서 자동 처리됨
    fetchMyResolution();
    fetchFlexibleGoals();
    fetchToday();
    fetchProfile();

    return () => subscription?.remove();
  }, [expireOverdueGoals, cleanupOldGoals, fetchMyResolution, fetchToday]);

  /* 당겨서 새로고침 함수 */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log("🔄 당겨서 새로고침 시작");

      // 모든 데이터 동시 새로고침
      await Promise.all([
        fetchGoals(),
        fetchProfile(),
        fetchToday(),
        fetchMyResolution(),
        fetchFlexibleGoals(),
        expireOverdueGoals(),
      ]);

      console.log("✅ 당겨서 새로고침 완료");

      // 성공 피드백 (옵션)
      // Alert.alert("새로고침 완료", "최신 데이터로 업데이트되었습니다");
    } catch (error) {
      console.error("❌ 새로고침 오류:", error);
      Alert.alert("새로고침 실패", "데이터를 불러오는 중 오류가 발생했습니다");
    } finally {
      setRefreshing(false);
    }
  };

  // 화면 포커스 시 데이터 새로고침
  useEffect(() => {
    if (!navigation) return;

    const unsubscribe = navigation.addListener("focus", () => {
      console.log("🔄 GoalListScreen 포커스 - 데이터 새로고침");
      fetchProfile();
      fetchGoals().catch(console.error);
    });
    return unsubscribe;
  }, [navigation, fetchProfile, fetchGoals]);

  /* ───── 하이브리드 실시간 상태 업데이트 ───── */
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  const [appState, setAppState] = useState(AppState.currentState);
  const intervalRef = useRef<number | null>(null);

  // 앱 상태 변화 감지
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log("🔄 앱 상태 변화:", appState, "→", nextAppState);
      setAppState(nextAppState);
    });

    return () => subscription?.remove();
  }, [appState]);

  // 하이브리드 간격 시스템
  useEffect(() => {
    const setupInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // 앱 활성 상태에 따른 간격 설정
      const intervalTime = appState === "active" ? 30000 : 300000; // 30초 vs 5분

      console.log(
        `🔄 간격 설정: ${appState === "active" ? "30초 (활성)" : "5분 (비활성)"}`,
      );

      intervalRef.current = setInterval(async () => {
        await expireOverdueGoals();
        forceUpdate(); // UI 강제 리렌더링
      }, intervalTime);
    };

    setupInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [appState, expireOverdueGoals]);

  // 앱이 활성화될 때 즉시 업데이트
  useEffect(() => {
    if (appState === "active") {
      console.log("🔄 앱 활성화 - 즉시 상태 업데이트");
      expireOverdueGoals().then(() => forceUpdate());
    }
  }, [appState, expireOverdueGoals]);

  // 전역 디버깅 함수 등록
  useEffect(() => {
    registerGlobalDebugFunctions();
  }, []);

  /* ───── 계산 ───── */
  const allGoalsWithCheck = useMemo(() => {
    console.log("🔄 allGoalsWithCheck 계산 시작!", {
      goals: goals.length,
      todayRetrospectExists,
    });
    const result = getGoalsWithCanCheck(todayRetrospectExists);
    console.log(
      "🔄 UI 업데이트 - 전체 목표들:",
      result.map((r) => ({
        title: r.goal.title,
        date: r.goal.target_time.slice(0, 10),
        canCheck: r.canCheck,
        canEdit: r.canEdit,
      })),
    );
    return result;
  }, [goals, todayRetrospectExists, getGoalsWithCanCheck]);

  // 직접 계산하여 리렌더링 문제 해결
  console.log("🔥 sections 계산 시작!");
  const sections: GoalSection[] = (() => {
    // 실시간 날짜 키 계산
    const { todayKey: currentTodayKey, tomorrowKey: currentTomorrowKey } =
      getCurrentDateKeys();
    console.log("📅 Date keys updated");

    // 한국 시간 기준으로 날짜 구분하여 필터링
    const todayGoals = allGoalsWithCheck
      .filter((x) => {
        const goalDate = new Date(x.goal.target_time);
        const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
        return koreanDate.toISOString().slice(0, 10) === currentTodayKey;
      })
      .sort(
        (a, b) =>
          new Date(a.goal.target_time).getTime() -
          new Date(b.goal.target_time).getTime(),
      );

    const tomorrowGoals = allGoalsWithCheck
      .filter((x) => {
        const goalDate = new Date(x.goal.target_time);
        const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
        const goalDateStr = koreanDate.toISOString().slice(0, 10);
        // 내일 목표 날짜 확인
        return goalDateStr === currentTomorrowKey;
      })
      .sort(
        (a, b) =>
          new Date(a.goal.target_time).getTime() -
          new Date(b.goal.target_time).getTime(),
      );

    // 목표 개수 및 날짜 키 확인 완료

    // 회고 상태 확인 완료

    // 내일 목표 상세 정보 처리 완료

    // 전체 목표 데이터 확인 및 날짜 분류 완료

    const sections: GoalSection[] = [];

    // 회고 작성 완료 후 워크플로우
    if (todayRetrospectExists) {
      // 회고 완료 후에는 당일 목표는 History에서만 확인 가능
      // 내일 목표만 "예정"으로 표시
      // 회고 완료 후 내일 목표 표시 처리

      // 회고 완료 후에는 오늘 목표도 표시 (체크 불가능, 편집 불가능)
      if (todayGoals.length > 0) {
        sections.push({
          title: "오늘 수행 목록",
          data: todayGoals,
        });
      }

      if (tomorrowGoals.length > 0) {
        sections.push({ title: "내일 수행 목록", data: tomorrowGoals });
      }

      // 필수 목표 확인 (내일 날짜로 변경)
      const tomorrowFlexible = getTomorrowFlexibleGoals();
      console.log("🔍 내일 필수 목표:", {
        개수: tomorrowFlexible.length,
        목록: tomorrowFlexible.map((g) => g.title),
      });

      // 필수 목표는 홈 화면에 표시하지 않음 (오른쪽 상단 버튼에만 표시)
    } else {
      // 회고 작성 전: 당일 목표와 내일 목표 모두 표시

      // 필수 목표는 홈 화면에 표시하지 않음 (오른쪽 상단 버튼에만 표시)
      const tomorrowFlexible = getTomorrowFlexibleGoals();
      console.log("🔍 내일 필수 목표 (오른쪽 상단 전용):", {
        개수: tomorrowFlexible.length,
        목록: tomorrowFlexible.map((g) => g.title),
      });

      if (todayGoals.length > 0) {
        sections.push({ title: "오늘 수행 목록", data: todayGoals });
      }

      // 내일 목표도 표시 (회고 완료 여부와 상관없이)
      if (tomorrowGoals.length > 0) {
        sections.push({ title: "내일 수행 목록", data: tomorrowGoals });
      }
    }

    console.log(
      "🔥 sections 최종 결과:",
      sections.map((s) => ({
        title: s.title,
        dataCount: s.data.length,
        dataItems: s.data.map((d) => d.goal.title),
      })),
    );

    return sections;
  })();

  // 한국 시간 기준으로 오늘 목표 필터링
  const { todayKey: realTimeTodayKey } = getCurrentDateKeys();
  const todayGoalsKorean = allGoalsWithCheck.filter((x) => {
    const goalDate = new Date(x.goal.target_time);
    const koreanDate = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
    return koreanDate.toISOString().slice(0, 10) === realTimeTodayKey;
  });

  const todayCount = todayGoalsKorean.length;
  const todayGoals = todayGoalsKorean;
  const allDoneToday =
    todayGoals.length > 0 &&
    todayGoals.every((x) => x.goal.status !== "pending");
  const successCount = todayGoals.filter(
    (x) => x.goal.status === "success",
  ).length;
  const failureCount = todayGoals.filter(
    (x) => x.goal.status === "failure",
  ).length;

  // 회고 버튼 활성화 조건 디버깅
  console.log("🔍 회고 버튼 활성화 조건:", {
    todayCount,
    allDoneToday,
    todayRetrospectExists,
    조건만족: allDoneToday && !todayRetrospectExists,
    오늘목표상태: todayGoals.map((g) => ({
      title: g.goal.title,
      status: g.goal.status,
    })),
  });

  const canWriteToday = !todayRetrospectExists;
  const canWriteTomorrow = todayRetrospectExists;

  /* 꿈 편집 핸들러 */
  const handleStartEditDream = () => {
    const currentDream = profile?.dream || "";
    setDreamText(currentDream);
    setIsEditingDream(true);
  };

  const handleSaveDream = async () => {
    try {
      // 키보드 먼저 닫기
      Keyboard.dismiss();

      // 로컬 상태 먼저 업데이트 (즉시 UI 반영)
      if (profile) {
        useProfileStore.setState({
          profile: { ...profile, dream: dreamText.trim() },
        });
      }

      // 백그라운드에서 데이터베이스 업데이트
      await updateDream(dreamText.trim());
      setIsEditingDream(false);
      Alert.alert("성공", "꿈이 저장되었습니다! 🌟");
    } catch (error) {
      console.error("꿈 저장 실패:", error);
      Alert.alert("오류", "꿈 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleCancelDream = () => {
    // 키보드 먼저 닫기
    Keyboard.dismiss();
    setIsEditingDream(false);
    setDreamText("");
  };

  /* 각오 편집 핸들러 */
  const handleWriteResolution = () => {
    setResolutionText(myResolution?.content || "");
    setIsWritingResolution(true);
  };

  const handleSaveResolution = async () => {
    if (!resolutionText.trim()) {
      Alert.alert("알림", "각오를 입력해주세요.");
      return;
    }

    if (resolutionText.length > 100) {
      Alert.alert("알림", "각오는 100자 이내로 작성해주세요.");
      return;
    }

    try {
      Keyboard.dismiss();
      if (myResolution) {
        await updateMyResolution(resolutionText.trim());
      } else {
        await saveResolution(resolutionText.trim());
      }
      setIsWritingResolution(false);
      setResolutionText("");
      Alert.alert("성공", "내일의 각오가 저장되었습니다! 💪");
    } catch (error: any) {
      Alert.alert("오류", error.message || "각오 저장에 실패했습니다.");
    }
  };

  const handleCancelResolution = () => {
    Keyboard.dismiss();
    setIsWritingResolution(false);
    setResolutionText("");
  };

  const handleDeleteResolution = () => {
    Alert.alert("삭제 확인", "정말로 내일의 각오를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMyResolution();
            Alert.alert("성공", "각오가 삭제되었습니다.");
          } catch (error: any) {
            Alert.alert("오류", error.message || "각오 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  /* 메모 관련 핸들러 */
  const handleAddMemo = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    setSelectedGoalId(goalId);
    setMemoText(goal.achievement_memo || "");
    setMemoModalVisible(true);
  };

  const handleSaveMemo = async () => {
    if (!selectedGoalId) return;

    try {
      await addAchievementMemo(selectedGoalId, memoText.trim());
      setMemoModalVisible(false);
      setSelectedGoalId(null);
      setMemoText("");
      Alert.alert("성공", "수행 기록이 저장되었습니다!");
    } catch (error: any) {
      Alert.alert("오류", error.message || "기록 저장에 실패했습니다.");
    }
  };

  const handleCancelMemo = () => {
    setMemoModalVisible(false);
    setSelectedGoalId(null);
    setMemoText("");
  };

  /* 목표 체크 */
  const handleCheckGoal = async (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    // 기존 checkGoal 함수 호출 (뱃지 시스템은 goalStore에서 자동 처리됨)
    await checkGoal(goalId);
  };

  /* ───── Header Component ───── */
  const headerComponent = (
    <>
      {/* 상단 헤더 영역 - 흰색 배경 */}
      <View style={styles.topHeaderSection}>
        <View style={styles.topHeaderContent}>
          {/* 왼쪽: 로고 + 날짜 */}
          <View style={styles.leftHeaderSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🌟</Text>
              <Text style={styles.logoText}>Better Day</Text>
            </View>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })}
            </Text>
          </View>

          {/* 오른쪽: 유연한 목표 */}
          <View style={styles.rightHeaderSection}>
            {(() => {
              const tomorrowFlexibleGoals = getTomorrowFlexibleGoals();

              return tomorrowFlexibleGoals.length > 0 ? (
                <TouchableOpacity
                  style={styles.flexibleGoalWidget}
                  onPress={() => {
                    if (navigation) {
                      navigation.navigate("FlexibleGoal", {
                        targetDate: "tomorrow",
                      });
                    }
                  }}
                >
                  <Text style={styles.flexibleGoalPreview}>
                    {tomorrowFlexibleGoals[0]?.title || ""}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.flexibleGoalAddWidget}
                  onPress={() => {
                    if (navigation) {
                      navigation.navigate("FlexibleGoal", {
                        targetDate: "tomorrow",
                      });
                    }
                  }}
                >
                  <Text style={styles.flexibleGoalAddText}>
                    꼭! 하고자 하는 하나! +
                  </Text>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        {/* 꿈 설정 카드 - 작게 */}
        <View style={styles.dreamCardSmall}>
          <Text
            style={[
              styles.dreamTextSmall,
              {
                fontSize: (() => {
                  const dreamText = profile?.dream || "꿈을 설정해주세요";
                  const length = dreamText.length;

                  // 더 세밀한 글자수 구간 설정으로 최적화
                  if (length <= 15) return 14; // 1줄, 여유 있게
                  if (length <= 30) return 13; // 1-2줄
                  if (length <= 45) return 12; // 2줄
                  if (length <= 65) return 11; // 2-3줄
                  if (length <= 85) return 10; // 3줄
                  if (length <= 110) return 9; // 3-4줄
                  if (length <= 140) return 8; // 4-5줄
                  return 7; // 5줄 이상 (200자까지 대응)
                })(),
                lineHeight: (() => {
                  const dreamText = profile?.dream || "꿈을 설정해주세요";
                  const length = dreamText.length;

                  // 글자 크기에 맞춘 줄 간격 조정
                  if (length <= 15) return 16; // 14px + 2
                  if (length <= 30) return 15; // 13px + 2
                  if (length <= 45) return 14; // 12px + 2
                  if (length <= 65) return 13; // 11px + 2
                  if (length <= 85) return 12; // 10px + 2
                  if (length <= 110) return 11; // 9px + 2
                  if (length <= 140) return 10; // 8px + 2
                  return 9; // 7px + 2
                })(),
              },
            ]}
            numberOfLines={undefined} // 여러 줄 허용
          >
            {profile?.dream || "꿈을 설정해주세요"}
          </Text>
        </View>
      </View>

      {/* 꿈 편집 모달 */}
      {isEditingDream && (
        <View style={styles.dreamEditModal}>
          <View style={styles.dreamEditContent}>
            <TextInput
              style={styles.dreamInput}
              value={dreamText}
              onChangeText={setDreamText}
              placeholder="꿈을 입력해주세요..."
              placeholderTextColor="#999"
              multiline
              maxLength={200}
              autoFocus
            />
            <View style={styles.dreamButtonContainer}>
              <TouchableOpacity
                style={[styles.dreamButton, styles.cancelButton]}
                onPress={handleCancelDream}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dreamButton, styles.saveButton]}
                onPress={handleSaveDream}
              >
                <Text style={styles.saveButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
  );

  /* ───── Footer ───── */
  const FooterButtons = () => (
    <View style={styles.footerBox}>
      {/* 중앙 플러스 버튼 */}
      {!todayRetrospectExists && (
        <View style={styles.centerPlusContainer}>
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => {
              console.log("🔘 플러스 버튼 클릭 - navigation 상태:", {
                navigation: !!navigation,
                navigate: !!navigation?.navigate,
                todayCount,
              });

              if (!navigation) {
                console.error("❌ navigation이 null입니다!");
                return;
              }

              if (!navigation.navigate) {
                console.error("❌ navigation.navigate가 존재하지 않습니다!");
                return;
              }

              // 🔥 스마트 목표 추가 로직: 기존 목표와 같은 날짜로 추가
              try {
                // 내일 목표 개수 확인
                const tomorrowGoals = allGoalsWithCheck.filter((x) => {
                  const goalDate = new Date(x.goal.target_time);
                  const koreanDate = new Date(
                    goalDate.getTime() + 9 * 60 * 60 * 1000,
                  );
                  const { tomorrowKey: currentTomorrowKey } =
                    getCurrentDateKeys();
                  return (
                    koreanDate.toISOString().slice(0, 10) === currentTomorrowKey
                  );
                });

                console.log("🎯 스마트 목표 추가 로직:", {
                  tomorrowGoalsCount: tomorrowGoals.length,
                  todayGoalsCount: todayCount,
                  decision:
                    tomorrowGoals.length > 0 ? "내일에 추가" : "오늘에 추가",
                });

                // 내일 목표가 있으면 내일에 추가, 없으면 오늘에 추가
                if (tomorrowGoals.length > 0) {
                  // 내일 목표가 있으면 내일에 추가
                  if (tomorrowGoals.length < 5) {
                    console.log("🚀 내일 목표 일괄 작성 - GoalBatch로 이동");
                    navigation.navigate("GoalBatch", { initial: "tomorrow" });
                  } else {
                    console.log("🚀 내일 개별 목표 추가 - TimeSelect로 이동");
                    navigation.navigate("TimeSelect", { initial: "tomorrow" });
                  }
                } else {
                  // 내일 목표가 없으면 오늘에 추가 (또는 내일 일괄 작성)
                  if (todayCount === 0) {
                    console.log("🚀 내일 목표 일괄 작성 - GoalBatch로 이동");
                    navigation.navigate("GoalBatch", { initial: "tomorrow" });
                  } else {
                    console.log(
                      "🚀 오늘 목표 추가 (3시간 제약) - TimeSelect로 이동",
                    );
                    navigation.navigate("TimeSelect", { initial: "today" });
                  }
                }
              } catch (error) {
                console.error("❌ navigate 호출 중 오류:", error);
              }
            }}
          >
            <Ionicons name="add" size={56} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}

      {/* 모든 목표 완료 시 회고 작성 버튼 */}
      {allDoneToday && !todayRetrospectExists && (
        <TouchableOpacity
          style={styles.retrospectCompactButton}
          onPress={() => {
            console.log("🔘 회고 버튼 클릭 - navigation 상태:", {
              navigation: !!navigation,
              navigate: !!navigation?.navigate,
            });

            if (!navigation) {
              console.error("❌ 회고 버튼: navigation이 null입니다!");
              return;
            }

            if (!navigation.navigate) {
              console.error(
                "❌ 회고 버튼: navigation.navigate가 존재하지 않습니다!",
              );
              return;
            }

            try {
              console.log("🚀 Retrospect로 이동");
              navigation.navigate("Retrospect");
            } catch (error) {
              console.error("❌ 회고 버튼 navigate 호출 중 오류:", error);
            }
          }}
        >
          <Text style={styles.retrospectCompactButtonText}>
            📝 오늘 회고 작성
          </Text>
        </TouchableOpacity>
      )}

      {/* 회고 작성 후: 내일 목표 작성 */}
      {todayRetrospectExists && (
        <View style={styles.centerPlusContainer}>
          <TouchableOpacity
            style={styles.plusButton}
            onPress={() => {
              console.log("🔘 내일 목표 플러스 버튼 클릭 - navigation 상태:", {
                navigation: !!navigation,
                navigate: !!navigation?.navigate,
              });

              // 내일 목표가 5개 미만이면 일괄 등록, 5개 이상이면 개별 추가
              const tomorrowGoals = allGoalsWithCheck.filter((x) => {
                const goalDate = new Date(x.goal.target_time);
                const koreanDate = new Date(
                  goalDate.getTime() + 9 * 60 * 60 * 1000,
                );
                const { tomorrowKey: currentTomorrowKey } =
                  getCurrentDateKeys();
                return (
                  koreanDate.toISOString().slice(0, 10) === currentTomorrowKey
                );
              });

              if (!navigation) {
                console.error("❌ 내일 목표 버튼: navigation이 null입니다!");
                return;
              }

              if (!navigation.navigate) {
                console.error(
                  "❌ 내일 목표 버튼: navigation.navigate가 존재하지 않습니다!",
                );
                return;
              }

              try {
                if (tomorrowGoals.length < 5) {
                  console.log("🚀 내일 목표 - GoalBatch로 이동");
                  navigation.navigate("GoalBatch", { initial: "tomorrow" });
                } else {
                  console.log("🚀 내일 목표 - TimeSelect로 이동");
                  navigation.navigate("TimeSelect", { initial: "tomorrow" });
                }
              } catch (error) {
                console.error(
                  "❌ 내일 목표 버튼 navigate 호출 중 오류:",
                  error,
                );
              }
            }}
          >
            <Ionicons name="add" size={56} color="#ffffff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  /* ───── Row ───── */
  const renderItem = ({
    item,
  }: {
    item: { goal: Goal; canCheck: boolean; canEdit: boolean };
  }) => {
    const t = new Date(item.goal.target_time)
      .toLocaleTimeString("ko-KR", {
        hour12: true,
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace("AM", "오전")
      .replace("PM", "오후");

    let indicator = null;
    if (item.goal.status === "success") {
      // 연승 뱃지 데이터 가져오기 (Map에서 올바르게 접근)
      const goalId = item.goal.id;
      const goalBadge = goalBadges.get(goalId);

      console.log("🏆 뱃지 확인:", {
        goalId,
        goalBadge,
        hasGoalBadge: !!goalBadge,
        goalBadgesSize: goalBadges.size,
      });

      // goalBadge가 있으면 실제 이미지 사용
      let badgeImage = null;
      if (goalBadge) {
        badgeImage = getBadgeImage(goalBadge.category, goalBadge.level);
        console.log("🖼️ 뱃지 이미지:", {
          category: goalBadge.category,
          level: goalBadge.level,
          hasImage: !!badgeImage,
          badgeImage,
        });
      }

      indicator = (
        <View style={[styles.statusBadge, styles.successBadge]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {badgeImage && (
              <Image
                source={badgeImage}
                style={{ width: 16, height: 16, marginRight: 4 }}
                resizeMode="contain"
              />
            )}
            <Text style={styles.statusText}>승리</Text>
          </View>
        </View>
      );
    } else if (item.goal.status === "failure")
      indicator = (
        <View style={[styles.statusBadge, styles.failureBadge]}>
          <Text style={styles.statusText}>😞 패배</Text>
        </View>
      );
    else
      indicator = (
        <TouchableOpacity
          disabled={!item.canCheck}
          onPress={() => checkGoal(item.goal.id)}
          style={[
            styles.checkButton,
            item.canCheck
              ? styles.checkButtonActive
              : styles.checkButtonInactive,
          ]}
        >
          <Text
            style={[
              styles.checkButtonText,
              item.canCheck ? { color: "#fff" } : { color: "#999" },
            ]}
          >
            {item.canCheck ? "확인" : "대기"}
          </Text>
        </TouchableOpacity>
      );

    return (
      <View style={styles.item}>
        {/* 제목·시간 */}
        <View style={styles.titleTimeContainer}>
          <Text style={styles.title}>{item.goal.title}</Text>
          <Text style={styles.time}>{t}</Text>
        </View>

        {/* 수정 + 상태 */}
        <View style={styles.actions}>
          {item.canEdit && (
            <>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  console.log("🔘 수정 버튼 클릭 - navigation 상태:", {
                    navigation: !!navigation,
                    navigate: !!navigation?.navigate,
                    goalId: item.goal.id,
                  });

                  if (!navigation) {
                    console.error("❌ 수정 버튼: navigation이 null입니다!");
                    return;
                  }

                  if (!navigation.navigate) {
                    console.error(
                      "❌ 수정 버튼: navigation.navigate가 존재하지 않습니다!",
                    );
                    return;
                  }

                  try {
                    console.log("🚀 GoalDetail로 이동, goalId:", item.goal.id);
                    navigation.navigate("GoalDetail", { goalId: item.goal.id });
                  } catch (error) {
                    console.error("❌ 수정 버튼 navigate 호출 중 오류:", error);
                  }
                }}
              >
                <Text style={styles.editButtonText}>수정</Text>
              </TouchableOpacity>
              <View style={{ width: 8 }} />
            </>
          )}
          {indicator}

          {/* 승리한 목표에만 "단일 수행 기록" 버튼 표시 */}
          {item.goal.status === "success" && (
            <>
              <View style={{ width: 8 }} />
              <TouchableOpacity
                style={styles.memoButton}
                onPress={() => handleAddMemo(item.goal.id)}
              >
                <Text style={styles.memoButtonText}>📝 기록</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({
    section,
  }: {
    section: SectionListData<
      { goal: Goal; canCheck: boolean; canEdit: boolean },
      GoalSection
    >;
  }) => (
    <View>
      {/* "오늘" 또는 "내일 수행 목록" 섹션에서는 검은색 영역에 제목과 각오 통합 */}
      {(section.title === "오늘" ||
        section.title === "오늘 수행 목록" ||
        section.title === "내일 수행 목록") && (
        <View style={styles.todaySection}>
          {/* 수행 목록 제목 */}
          <Text style={styles.todaySectionTitle}>
            {section.title === "내일 수행 목록"
              ? "내일 수행 목록"
              : "오늘 수행 목록"}
          </Text>

          {/* 각오 영역 - 각오가 저장되어 있으면 작성 UI 완전히 숨김 */}
          {!myResolution && (
            <View style={styles.resolutionContainer}>
              {!isWritingResolution && (
                <TouchableOpacity
                  style={styles.resolutionWriteButton}
                  onPress={handleWriteResolution}
                >
                  <Text style={styles.resolutionWriteButtonText}>
                    💪 내일의 각오 작성하기
                  </Text>
                </TouchableOpacity>
              )}

              {isWritingResolution && (
                <View style={styles.resolutionWriteSection}>
                  <TextInput
                    style={styles.resolutionTextInput}
                    placeholder="내일의 각오를 입력해주세요 (최대 100자)"
                    value={resolutionText}
                    onChangeText={setResolutionText}
                    multiline
                    maxLength={100}
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.resolutionCharCount}>
                    {resolutionText.length}/100
                  </Text>
                  <View style={styles.resolutionWriteActions}>
                    <TouchableOpacity
                      style={styles.resolutionCancelButton}
                      onPress={handleCancelResolution}
                    >
                      <Text style={styles.resolutionCancelButtonText}>
                        취소
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resolutionSaveButton}
                      onPress={handleSaveResolution}
                    >
                      <Text style={styles.resolutionSaveButtonText}>저장</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 저장된 각오 표시 (수정/삭제 가능) */}
          {myResolution && (
            <View style={styles.resolutionContainer}>
              <TouchableOpacity
                style={[
                  styles.myResolutionCard,
                  isResolutionExpanded && styles.myResolutionCardExpanded,
                  // 텍스트 길이에 따른 동적 패딩 조절
                  {
                    paddingVertical:
                      myResolution.content.length > 60
                        ? 6
                        : myResolution.content.length > 30
                          ? 8
                          : 12,
                  },
                ]}
                onPress={() => setIsResolutionExpanded(!isResolutionExpanded)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.myResolutionContent,
                    {
                      textAlign: "left",
                      // 텍스트 길이에 따른 동적 폰트 크기와 줄 간격
                      fontSize:
                        myResolution.content.length > 60
                          ? 11
                          : myResolution.content.length > 30
                            ? 12
                            : 13,
                      lineHeight:
                        myResolution.content.length > 60
                          ? 14
                          : myResolution.content.length > 30
                            ? 15
                            : 16,
                    },
                  ]}
                  numberOfLines={
                    myResolution.content.length > 60
                      ? 3
                      : myResolution.content.length > 30
                        ? 2
                        : 1
                  }
                >
                  {myResolution.content}
                </Text>
                {isResolutionExpanded && (
                  <View style={styles.myResolutionActions}>
                    <TouchableOpacity
                      style={styles.resolutionActionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleWriteResolution();
                        setIsResolutionExpanded(false);
                      }}
                    >
                      <Text style={styles.resolutionActionText}>수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resolutionActionButton}
                      onPress={async (e) => {
                        e.stopPropagation();
                        try {
                          await deleteMyResolution();
                          setIsResolutionExpanded(false);
                          Alert.alert("성공", "각오가 삭제되었습니다.");
                        } catch (error: any) {
                          Alert.alert(
                            "오류",
                            error.message || "삭제에 실패했습니다.",
                          );
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.resolutionActionText,
                          { color: "#FF3B30" },
                        ]}
                      >
                        삭제
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>

              {/* 수정 모드 시 입력창 표시 */}
              {isWritingResolution && (
                <View style={styles.resolutionWriteSection}>
                  <TextInput
                    style={styles.resolutionTextInput}
                    placeholder="내일의 각오를 입력해주세요 (최대 100자)"
                    value={resolutionText}
                    onChangeText={setResolutionText}
                    multiline
                    maxLength={100}
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.resolutionCharCount}>
                    {resolutionText.length}/100
                  </Text>
                  <View style={styles.resolutionWriteActions}>
                    <TouchableOpacity
                      style={styles.resolutionCancelButton}
                      onPress={handleCancelResolution}
                    >
                      <Text style={styles.resolutionCancelButtonText}>
                        취소
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resolutionSaveButton}
                      onPress={handleSaveResolution}
                    >
                      <Text style={styles.resolutionSaveButtonText}>저장</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {/* 일반 섹션 헤더 (내일/커뮤니티 제외) */}
      {section.title !== "내일" &&
        section.title !== "커뮤니티" &&
        section.title !== "내일 수행 목록" && (
          <View style={styles.upcomingSection}>
            <Text style={styles.upcomingSectionTitle}>{section.title}</Text>
          </View>
        )}
    </View>
  );

  /* ───── 렌더 ───── */
  return (
    <>
      <SectionList
        style={{ flex: 1, backgroundColor: "#1C1C1E" }}
        sections={sections}
        keyExtractor={(item) => item.goal.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={headerComponent}
        ListFooterComponent={FooterButtons}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>목표를 시작해보세요! 🎯</Text>
            <Text style={styles.emptySubtitle}>
              하루 5개의 목표로 작은 성취를 쌓아가세요
            </Text>
            <Text style={styles.emptyHint}>
              "+" 버튼을 눌러 수행 목록을 추가해보세요
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      />

      {/* 메모 모달 */}
      <Modal
        visible={memoModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelMemo}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📝 단일 수행 기록</Text>
            <Text style={styles.modalSubtitle}>
              {selectedGoalId
                ? goals.find((g) => g.id === selectedGoalId)?.title
                : ""}
            </Text>

            <TextInput
              style={styles.memoInput}
              placeholder="수행 내용을 기록해주세요..."
              placeholderTextColor="#999"
              value={memoText}
              onChangeText={setMemoText}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />

            <Text style={styles.memoCharCount}>{memoText.length}/200</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={handleCancelMemo}
              >
                <Text style={styles.cancelModalButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleSaveMemo}
              >
                <Text style={styles.saveModalButtonText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 디버깅용 알림 확인 버튼 (개발 모드에서만 표시) */}
      {__DEV__ && (
        <View style={styles.debugPanel}>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              console.log("🔍 알림 디버깅 시작");
              try {
                await checkAllNotifications();
                Alert.alert("알림 확인", "콘솔에서 알림 목록을 확인해주세요.");
              } catch (error) {
                console.error("❌ 알림 확인 실패:", error);
                Alert.alert("오류", "알림 확인 중 오류가 발생했습니다.");
              }
            }}
          >
            <Text style={styles.debugButtonText}>🔔 알림 확인</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: "#FF3B30", marginTop: 4 },
            ]}
            onPress={async () => {
              console.log("🧹 모든 알림 취소 시작");
              try {
                await cancelAllNotifications();
                Alert.alert("알림 취소", "모든 알림이 취소되었습니다.");
              } catch (error) {
                console.error("❌ 알림 취소 실패:", error);
                Alert.alert("오류", "알림 취소 중 오류가 발생했습니다.");
              }
            }}
          >
            <Text style={styles.debugButtonText}>🔕 알림 모두 취소</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

/* ───── 스타일 ───── */
const styles = StyleSheet.create({
  // 상단 헤더 섹션 (흰색 배경)
  topHeaderSection: {
    backgroundColor: "#FFFFFF",
    paddingTop: 50, // 상태바 여백
    paddingHorizontal: 8,
    paddingBottom: 30,
  },

  topHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },

  leftHeaderSection: {
    alignItems: "flex-start",
  },

  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  logoEmoji: {
    fontSize: 20,
    marginRight: 4,
  },
  logoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },

  dateText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
    marginLeft: 20,
  },

  rightHeaderSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  flexibleGoalWidget: {
    backgroundColor: "#FFF2E6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 100,
    maxWidth: 140,
  },

  flexibleGoalTitle: {
    fontSize: 11,
    color: "#B8860B",
    fontWeight: "600",
    marginBottom: 2,
  },

  flexibleGoalPreview: {
    fontSize: 10,
    color: "#B8860B",
    textAlign: "center",
  },

  flexibleGoalAddWidget: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  flexibleGoalAddText: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
  },

  dreamCardSmall: {
    backgroundColor: "#F8F8F8",
    borderRadius: 10,
    marginTop: 10,
    marginLeft: 10,
    marginRight: 10,
    paddingHorizontal: 12, // 가로 패딩 약간 줄임
    paddingVertical: 8, // 세로 패딩 줄여서 텍스트 공간 확보
    justifyContent: "center",
    alignItems: "flex-start", // 왼쪽 정렬을 위해 변경
    minHeight: 60,
    maxHeight: 60, // 박스 크기 고정
  },

  dreamTextSmall: {
    fontSize: 14, // 기본 폰트 크기 (동적으로 조정됨)
    color: "#666",
    lineHeight: 16, // 기본 줄 간격 (동적으로 조정됨)
    textAlign: "left", // 왼쪽 정렬로 변경
    width: "100%",
  },

  // 검은색 섹션 스타일 제거 (더 이상 사용 안 함)

  resolutionWriteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#3A3A3C",
    borderStyle: "dashed",
  },

  resolutionWriteButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  myResolutionCard: {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#3A3A3C",
    minHeight: 70,
    maxHeight: 70,
    justifyContent: "center",
  },

  myResolutionCardExpanded: {
    minHeight: 150,
    maxHeight: 250,
    paddingBottom: 24,
  },

  myResolutionLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: 8,
  },

  myResolutionActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    gap: 12,
  },

  resolutionActionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  resolutionActionText: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "500",
  },

  myResolutionContent: {
    fontSize: 13,
    color: "#FFFFFF",
    lineHeight: 16,
    fontWeight: "500",
    textAlignVertical: "center",
  },

  resolutionWriteSection: {
    backgroundColor: "#2C2C2E",
    borderRadius: 12,
    padding: 16,
  },

  resolutionTextInput: {
    backgroundColor: "#3A3A3C",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#FFFFFF",
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: "top",
    marginBottom: 8,
  },

  resolutionCharCount: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "right",
    marginBottom: 12,
  },

  resolutionWriteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },

  resolutionCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#3A3A3C",
  },

  resolutionCancelButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },

  resolutionSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#007AFF",
  },

  resolutionSaveButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // 회고 작성 버튼 스타일
  retrospectWriteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#34C759",
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: "#30D158",
  },

  retrospectWriteButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // 컴팩트 회고 작성 버튼 (하단)
  retrospectCompactButton: {
    backgroundColor: "transparent",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },

  retrospectCompactButtonText: {
    fontSize: 16,
    color: "#E67E22",
    fontWeight: "600",
  },

  dreamEditModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },

  dreamEditContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 25,
    width: "95%",
    maxWidth: 380,
  },

  centerPlusContainer: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#1C1C1E",
  },

  plusButton: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  headerBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  // headerBox 전용으로 이동

  dateTxt: {
    fontWeight: "700",
    fontSize: 14,
    color: "#666",
  },
  dreamTxt: {
    color: "#666",
    marginTop: 4,
    fontSize: 14,
  },
  dreamEditHint: {
    color: "#999",
    fontSize: 12,
    marginTop: 1,
  },
  summaryTxt: {
    color: "#999",
    fontSize: 12,
    marginTop: 4,
  },

  // 꿈 편집 스타일
  dreamContainer: {
    marginTop: 4,
    alignItems: "flex-end",
  },
  dreamEditContainer: {
    marginTop: 4,
    width: "100%",
    maxWidth: 250,
  },
  dreamInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: "#FFFFFF",
    color: "#333",
    minHeight: 40,
    maxHeight: 80,
    textAlignVertical: "top",
  },
  dreamButtonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    gap: 8,
  },
  dreamButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    minWidth: 50,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#7BA428",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  saveButtonText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#007AFF",
    fontSize: 14,
  },

  // 오늘 섹션 - 검은색 영역에 제목과 각오 통합
  todaySection: {
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },

  todaySectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 20,
  },

  // 내일 섹션
  upcomingSection: {
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },

  upcomingSectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  // 각오 관련 스타일 - 개선된 디자인
  resolutionContainer: {
    marginTop: 4,
  },

  // 유연한 목표 관련 스타일
  flexibleGoalSection: {
    backgroundColor: "#fff3cd",
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffeaa7",
  },
  flexibleGoalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  flexibleGoalSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#856404",
  },
  flexibleGoalDetailButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  flexibleGoalDetailText: {
    fontSize: 12,
    color: "#007AFF",
  },
  flexibleGoalAddButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ffeaa7",
    borderStyle: "dashed",
    alignItems: "center",
  },
  flexibleGoalAddButtonText: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
  },
  flexibleGoalAddButtonDesc: {
    fontSize: 12,
    color: "#6c757d",
    marginTop: 2,
  },
  flexibleGoalList: {
    gap: 8,
  },
  flexibleGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ffeaa7",
  },
  flexibleGoalIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  flexibleGoalContent: {
    flex: 1,
  },
  flexibleGoalText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  flexibleGoalCompleted: {
    textDecorationLine: "line-through",
    color: "#666",
  },
  flexibleGoalType: {
    fontSize: 12,
    color: "#856404",
  },
  flexibleGoalStatus: {
    fontSize: 18,
    marginLeft: 8,
  },

  footerBox: {
    marginTop: 8,
    alignItems: "center",
  },
  footerBtn: {
    width: "90%",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "#007AFF",
    alignItems: "center",
  },
  footerTxt: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  footerTxtDisabled: {
    color: "#007AFF",
  },

  sectionHeaderContainer: {
    backgroundColor: "#007AFF",
  },
  sectionHeader: {
    padding: 8,
    fontWeight: "700",
    color: "#007AFF",
    fontSize: 14,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 8,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  titleTimeContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    color: "#007AFF",
    fontWeight: "500",
    marginBottom: 12,
  },
  time: {
    color: "#007AFF",
    fontSize: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "transparent",
  },

  // 상태 표시 스타일
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  successBadge: {
    backgroundColor: "#75bbd9",
  },
  failureBadge: {
    backgroundColor: "#FF9800",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  checkButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  checkButtonActive: {
    backgroundColor: "#D4AF37",
  },
  checkButtonInactive: {
    backgroundColor: "#C8C8D0",
  },
  checkButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333333",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  editButtonText: {
    fontSize: 12,
    color: "#7BA428",
    fontWeight: "500",
  },

  // 메모 버튼 스타일
  memoButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#E6F3FF",
    borderWidth: 1,
    borderColor: "#7BA428",
  },
  memoButtonText: {
    fontSize: 11,
    color: "#7BA428",
    fontWeight: "600",
  },

  // 메모 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    padding: 8,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    textAlign: "center",
  },
  memoInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: "top",
    marginBottom: 8,
  },
  memoCharCount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelModalButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  saveModalButton: {
    backgroundColor: "#007AFF",
  },
  cancelModalButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // 빈 상태 스타일
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 16,
    color: "#B3B3B3",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 22,
  },

  emptyHint: {
    fontSize: 14,
    color: "#8A8A8A",
    textAlign: "center",
    fontStyle: "italic",
  },

  // 디버깅 패널 스타일
  debugPanel: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 8,
    padding: 8,
  },

  debugButton: {
    backgroundColor: "#007AFF",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  debugButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
});
