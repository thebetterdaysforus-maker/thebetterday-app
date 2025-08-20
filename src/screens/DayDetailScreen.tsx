import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useGoalStore from "../store/goalStore";
import useRetrospectStore from "../store/retrospectStore";
import { useFlexibleGoalStore } from "../store/flexibleGoalStore";
import useCommunityStore from "../store/communityStore";
import { supabase } from "../supabaseClient";

/* ---------- 타입 ---------- */
interface DailyStatsRow {
  total: number | null;
  success_cnt: number | null;
  failure_cnt: number | null;
  rate: number | null; // numeric(5,2)
}

export default function DayDetailScreen({ route }: any) {
  const date = route.params.date as string; // YYYY-MM-DD

  /* ---------- store ---------- */
  const { goals, fetchGoals } = useGoalStore();
  const { fetchOne } = useRetrospectStore();
  const { getGoalsByDate, fetchGoals: fetchFlexibleGoals } =
    useFlexibleGoalStore();
  const { fetchMyResolution } = useCommunityStore();

  /* ---------- state ---------- */
  const [stats, setStats] = useState<DailyStatsRow | null>(null);
  const [retro, setRetro] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMemo, setShowMemo] = useState<{ [key: string]: boolean }>({});

  /* ---------- 성공률 등급 계산 ---------- */
  const getRateLevel = (
    rate: number,
  ): { level: string; color: string; bgColor: string } => {
    if (rate === 100)
      return { level: "Trans", color: "#fff", bgColor: "#1a237e" };
    if (rate >= 70) return { level: "Good", color: "#fff", bgColor: "#2e7d32" };
    if (rate >= 30) return { level: "SoSo", color: "#fff", bgColor: "#f57c00" };
    return { level: "Bad", color: "#fff", bgColor: "#d32f2f" };
  };

  /* ---------- fetch ---------- */
  useEffect(() => {
    (async () => {
      try {
        /* (1) 스토어 캐시 동기화 */
        if (goals.length === 0) await fetchGoals();

        /* (1-2) 필수 목표 동기화 */
        console.log("🔄 DayDetail: 필수 목표 동기화 시작 - date:", date);
        await fetchFlexibleGoals(date);
        console.log(
          "🔄 DayDetail: 필수 목표 동기화 완료 - 개수:",
          getGoalsByDate(date).length,
        );

        /* (2) 회고 */
        const r = await fetchOne(date);
        setRetro(r?.text ?? null);

        /* (2.5) 그날의 각오/다짐 가져오기 */
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) {
            // 정식 회원 - Supabase에서 조회
            const { data: resolutionData } = await supabase
              .from("daily_resolutions")
              .select("content")
              .eq("user_id", session.user.id)
              .eq("date", date)
              .single();

            setResolution(resolutionData?.content || null);
          } else {
            // 게스트 모드 - AsyncStorage에서 조회
            const AsyncStorage = await import(
              "@react-native-async-storage/async-storage"
            );
            const guestResolutionsStr = await AsyncStorage.default.getItem(
              "guestDailyResolutions",
            );
            const guestResolutions = guestResolutionsStr
              ? JSON.parse(guestResolutionsStr)
              : [];
            const dateResolution = guestResolutions.find(
              (r: any) => r.date === date,
            );
            setResolution(dateResolution?.content || null);
          }
        } catch (err) {
          console.log("각오 조회 실패:", err);
          setResolution(null);
        }

        /* (3) 일별 통계 - 한국 시간 기준으로 직접 계산 */
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          // 게스트 사용자는 통계 없이 진행
          setStats({ total: 0, success_cnt: 0, failure_cnt: 0, rate: 0 });
          setLoading(false);
          return;
        }

        // 정시 목표 통계 계산 (한국 시간 기준)
        const regularGoalsForDate = goals.filter((g) => {
          const goalDate = new Date(g.target_time);
          const koreaTimeString = goalDate.toLocaleString("en-CA", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          return koreaTimeString === date;
        });

        // 필수 목표 통계 계산 (참고용)
        const flexibleGoalsForDate = getGoalsByDate(date);

        // 통계 계산: 정시 목표만 포함 (필수 목표는 제외)
        const total = regularGoalsForDate.length;
        const success_cnt = regularGoalsForDate.filter(
          (g) => g.status === "success",
        ).length;
        const failure_cnt = regularGoalsForDate.filter(
          (g) => g.status === "failure",
        ).length;
        const rate = total > 0 ? (success_cnt / total) * 100 : 0;

        console.log("📊 DayDetail 통계 계산 (정시 목표만 포함):", {
          date,
          정시목표: regularGoalsForDate.length,
          필수목표: flexibleGoalsForDate.length,
          통계포함: total,
          성공: success_cnt,
          실패: failure_cnt,
          성공률: rate,
        });

        setStats({
          total,
          success_cnt,
          failure_cnt,
          rate,
        });
      } catch (e: any) {
        console.warn(e);
        Alert.alert("알림", "데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    })();
  }, [date]);

  /* ---------- 파생 ---------- */
  const dayGoals = useMemo(() => {
    // 한국 시간 기준으로 목표 필터링
    const filteredGoals = goals
      .filter((g) => {
        const goalDate = new Date(g.target_time);
        const koreaTimeString = goalDate.toLocaleString("en-CA", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
        return koreaTimeString === date;
      })
      .sort((a, b) => a.target_time.localeCompare(b.target_time));

    console.log("🔍 DayDetail 목표 필터링:", {
      date,
      전체목표: goals.length,
      필터된목표: filteredGoals.length,
      목표들: filteredGoals.map((g) => ({
        title: g.title,
        time: g.target_time,
        koreanTime: new Date(
          new Date(g.target_time).getTime() + 9 * 60 * 60 * 1000,
        ).toISOString(),
      })),
    });

    return filteredGoals;
  }, [goals, date]);

  const flexibleGoals = useMemo(() => {
    const result = getGoalsByDate(date);
    const allFlexibleGoals = useFlexibleGoalStore.getState().goals;
    console.log("🎯 DayDetail 필수 목표 필터링 상세:", {
      date,
      전체필수목표: allFlexibleGoals.length,
      필터된필수목표: result.length,
      전체목표상세: allFlexibleGoals.map((g) => ({
        id: g.id,
        title: g.title,
        date: g.date,
        status: g.status,
        매치여부: g.date === date,
      })),
      필터된목표들: result.map((g) => ({
        id: g.id,
        title: g.title,
        date: g.date,
        status: g.status,
      })),
    });
    return result;
  }, [date, getGoalsByDate]);

  /* ---------- UI ---------- */
  const insets = useSafeAreaInsets();
  
  if (loading)
    return (
      <View style={s.center}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
        <View style={{ paddingTop: insets.top }} />
        <Text>Loading…</Text>
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={{ paddingTop: insets.top }} />
      <ScrollView contentContainerStyle={s.wrap}>
      {/* 날짜 헤드라인 */}
      <Text style={s.headDate}>{date}</Text>

      {/* ---- 통계 카드 ---- */}
      <View style={s.card}>
        {stats ? (
          <View style={s.statsRow}>
            <View style={s.statsInfo}>
              <Text>총 목표 {stats.total ?? 0}</Text>
              <Text style={{ color: "dodgerblue" }}>
                성공 {stats.success_cnt ?? 0}
              </Text>
              <Text style={{ color: "crimson" }}>
                실패 {stats.failure_cnt ?? 0}
              </Text>
              <Text>성공률 {stats.rate?.toFixed(1) ?? 0}%</Text>
            </View>
            {stats.rate !== null && (
              <View
                style={[
                  s.rateBadge,
                  { backgroundColor: getRateLevel(stats.rate).bgColor },
                ]}
              >
                <Text
                  style={[
                    s.rateBadgeText,
                    { color: getRateLevel(stats.rate).color },
                  ]}
                >
                  {getRateLevel(stats.rate).level}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={{ color: "#666" }}>집계 없음</Text>
        )}
      </View>

      {/* ---- 정시 목표 목록 ---- */}
      <Text style={s.sectionTitle}>
        {(() => {
          // 한국 시간 기준으로 날짜 계산
          const now = new Date();
          const todayKey = now.toLocaleString("en-CA", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const tomorrow = new Date(now.getTime() + 86400000);
          const tomorrowKey = tomorrow.toLocaleString("en-CA", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });

          if (date === todayKey) return "오늘 수행 목록";
          if (date === tomorrowKey) return "수행 목록";

          // 과거 날짜
          const targetDate = new Date(date);
          const dayOfWeek = targetDate.toLocaleDateString("ko-KR", {
            weekday: "short",
          });
          return `${dayOfWeek}의 정시 목표`;
        })()}
      </Text>
      {dayGoals.length === 0 ? (
        <Text style={s.empty}>정시 목표 없음</Text>
      ) : (
        dayGoals.map((g) => (
          <View key={g.id} style={s.goalContainer}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{g.title}</Text>
                <Text style={s.rowTime}>
                  {new Date(g.target_time)
                    .toLocaleTimeString("ko-KR", {
                      hour12: true,
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    .replace("AM", "오전")
                    .replace("PM", "오후")}
                </Text>
              </View>
              <Text
                style={[
                  s.badge,
                  g.status === "success" && s.badgeSuccess,
                  g.status === "failure" && s.badgeFail,
                ]}
              >
                {g.status === "pending"
                  ? "대기"
                  : g.status === "success"
                    ? "승리"
                    : "패배"}
              </Text>
            </View>
            {/* 달성 메모 보기 버튼 */}
            {g.status === "success" && g.achievement_memo && (
              <View style={s.memoSection}>
                <TouchableOpacity
                  style={s.memoButton}
                  onPress={() =>
                    setShowMemo((prev) => ({ ...prev, [g.id]: !prev[g.id] }))
                  }
                >
                  <Text style={s.memoButtonText}>
                    {showMemo[g.id] ? "메모 접기" : "메모 보기"}
                  </Text>
                </TouchableOpacity>
                {showMemo[g.id] && (
                  <View style={s.memoContainer}>
                    <Text style={s.memoLabel}>📝 달성 기록</Text>
                    <Text style={s.memoText}>{g.achievement_memo}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))
      )}

      {/* ---- 필수 목표 목록 ---- */}
      <Text style={s.sectionTitle}>
        {(() => {
          // 한국 시간 기준으로 날짜 계산
          const now = new Date();
          const todayKey = now.toLocaleString("en-CA", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const tomorrow = new Date(now.getTime() + 86400000);
          const tomorrowKey = tomorrow.toLocaleString("en-CA", {
            timeZone: "Asia/Seoul",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });

          if (date === tomorrowKey) return "필수 목표";
          if (date === todayKey) return "필수 목표";

          // 과거 날짜
          const targetDate = new Date(date);
          const dayOfWeek = targetDate.toLocaleDateString("ko-KR", {
            weekday: "short",
          });
          return `${dayOfWeek}의 필수 목표`;
        })()}
      </Text>
      {flexibleGoals.length === 0 ? (
        <Text style={s.empty}>필수 목표 없음</Text>
      ) : (
        flexibleGoals.map((g) => (
          <View key={g.id} style={s.goalContainer}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>🎯 {g.title}</Text>
                <Text style={s.rowTime}>시간 자유</Text>
              </View>
              <Text
                style={[
                  s.badge,
                  g.status === "success" && s.badgeSuccess,
                  g.status === "failure" && s.badgeFail,
                ]}
              >
                {g.status === "pending"
                  ? "대기"
                  : g.status === "success"
                    ? "승리"
                    : "패배"}
              </Text>
            </View>
          </View>
        ))
      )}

      {/* ---- 각오/다짐 ---- */}
      <Text style={s.sectionTitle}>각오/다짐</Text>
      {resolution ? (
        <View style={s.resolutionContainer}>
          <Text style={s.resolutionText}>{resolution}</Text>
        </View>
      ) : (
        <Text style={s.empty}>각오 없음</Text>
      )}

      {/* ---- 회고 ---- */}
      <Text style={s.sectionTitle}>회고</Text>
      {retro ? (
        <Text style={s.retro}>{retro}</Text>
      ) : (
        <Text style={s.empty}>회고 없음</Text>
      )}
      </ScrollView>
    </View>
  );
}

/* ---------- 스타일 ---------- */
const s = StyleSheet.create({
  wrap: { padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headDate: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  card: {
    backgroundColor: "#f9f9f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 16,
  },
  empty: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 16,
  },
  goalContainer: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  rowTitle: { fontSize: 16, fontWeight: "500" },
  rowTime: { fontSize: 14, color: "#666" },
  badge: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#ddd",
  },
  badgeSuccess: { backgroundColor: "#4caf50", color: "white" },
  badgeFail: { backgroundColor: "#f44336", color: "white" },
  memoSection: { paddingHorizontal: 8, marginTop: 4 },
  memoButton: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  memoButtonText: { fontSize: 12, color: "#1976d2", fontWeight: "500" },
  memoContainer: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  memoLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#2196f3",
    marginBottom: 4,
  },
  memoText: { fontSize: 14, lineHeight: 20, color: "#333" },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsInfo: { flex: 1 },
  rateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    minWidth: 50,
    alignItems: "center",
  },
  rateBadgeText: { fontSize: 14, fontWeight: "bold" },
  retro: {
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: "#f0f0f0",
    padding: 16,
    borderRadius: 8,
  },
  resolutionContainer: {
    backgroundColor: "#f0f8ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  resolutionText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    textAlign: "left",
  },
});
