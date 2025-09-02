// src/screens/HistoryCalendarScreen.tsx
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { memo, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CalendarProps, DateData } from "react-native-calendars";
import { Calendar } from "react-native-calendars";
import { supabase } from "../supabaseClient";
import { formatDateKorea, getTodayKorea } from "../utils/timeUtils";

/* ───────── 네비 타입 ───────── */
type HistoryStack = {
  Calendar: undefined;
  DayDetail: { date: string };
  Statistics: undefined;
};
type NavProp = NativeStackNavigationProp<HistoryStack, "Calendar">;

/* ───────── 달성률 → 라벨 & 색 ───────── */
const labelOf = (rate: number) =>
  rate === 100
    ? { txt: "Trans", color: "#1E3A8A" }
    : rate >= 70
      ? { txt: "Good", color: "seagreen" }
      : rate >= 30
        ? { txt: "SoSo", color: "#E67E22" }
        : { txt: "Unlucky", color: "crimson" };

/* ───────── 셀 컴포넌트 ───────── */
interface CellProps {
  date: DateData;
  meta?: { rate: number; hasRetro: boolean };
  onPress(dateISO: string): void;
}
const Cell = memo(({ date, meta, onPress }: CellProps) => {
  const isOtherMonth = !date.dateString.startsWith(
    date.month < 10 ? `0${date.month}` : `${date.month}`,
  );

  /* 빈셀(다른 달) — 터치 비활성 */
  if (!meta) {
    return (
      <View style={styles.cell}>
        <Text style={[styles.dayText, isOtherMonth && styles.dim]}>
          {date.day}
        </Text>
      </View>
    );
  }

  const { txt, color } = labelOf(meta.rate);

  return (
    <TouchableOpacity
      style={styles.cell}
      activeOpacity={0.7}
      onPress={() => onPress(date.dateString)}
    >
      <Text style={[styles.dayText, { color }]}>{date.day}</Text>
      <Text style={[styles.labelText, { color }]}>{txt}</Text>
      {meta.hasRetro && <View style={styles.retroDot} />}
    </TouchableOpacity>
  );
});

/* ───────── 메인 ───────── */
export default function HistoryCalendarScreen() {
  // Hook 호출 순서를 절대적으로 고정 - 조건부 호출 금지
  const nav = useNavigation<NavProp>();
  const insets = useSafeAreaInsets(); // 항상 최상단에서 호출
  const [meta, setMeta] = useState<
    Record<string, { rate: number; hasRetro: boolean }>
  >({});
  const [loading, setLoading] = useState(true);

  // useEffect도 항상 동일한 순서로 호출
  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          console.log("❌ 달력 사용자 인증 실패");
          setLoading(false);
          return;
        }
        console.log("✅ 달력 사용자 인증 성공");

        /* ① 정시 목표 가져오기 */
        const { data: goalsRaw, error: e1 } = await supabase
          .from("goals")
          .select("target_time, status")
          .eq("user_id", user.id);
        if (e1) throw e1;

        /* ② 유연한 목표 가져오기 */
        const { data: flexibleGoalsRaw, error: e2 } = await supabase
          .from("flexible_goals")
          .select("date, status")
          .eq("user_id", user.id);
        if (e2) throw e2;

        /* ③ 회고 */
        const { data: retrosRaw, error: e3 } = await supabase
          .from("retrospects")
          .select("date")
          .eq("user_id", user.id);
        if (e3) throw e3;

        const goals = goalsRaw ?? [];
        const flexibleGoals = flexibleGoalsRaw ?? [];
        const retros = retrosRaw ?? [];

        const retroSet = new Set(retros.map((r: any) => r.date));
        const m: Record<string, { rate: number; hasRetro: boolean }> = {};

        // 한국 시간 기준으로 날짜별 목표 그룹화
        const goalsByDate: Record<string, Array<{ status: string }>> = {};

        // 정시 목표 - 한국 시간 기준으로 날짜 변환 (더 정확한 변환)
        goals.forEach((goal: any) => {
          const goalDate = new Date(goal.target_time);

          // 한국 시간대로 정확한 변환 (여러 방법 시도)
          let dateKey: string;

          try {
            // 방법 1: Intl.DateTimeFormat 사용
            const formatter = new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Seoul",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            dateKey = formatter.format(goalDate);
          } catch (e1) {
            try {
              // 방법 2: toLocaleDateString 사용
              const koreanDateStr = goalDate.toLocaleDateString("sv-SE", {
                timeZone: "Asia/Seoul",
              });
              dateKey = koreanDateStr.slice(0, 10);
            } catch (e2) {
              // 방법 3: 수동 계산 (UTC + 9시간)
              const backupDate = new Date(
                goalDate.getTime() + 9 * 60 * 60 * 1000,
              );
              dateKey = backupDate.toISOString().slice(0, 10);
            }
          }

          console.log("📅 목표 날짜 변환:", {
            원본시간: goal.target_time,
            goalDate: goalDate.toISOString(),
            최종키: dateKey,
            목표상태: goal.status,
          });

          if (!goalsByDate[dateKey]) goalsByDate[dateKey] = [];
          goalsByDate[dateKey].push({ status: goal.status });
        });

        // 유연한 목표 추가
        flexibleGoals.forEach((goal: any) => {
          const dateKey = goal.date; // 이미 YYYY-MM-DD 형식

          if (!goalsByDate[dateKey]) goalsByDate[dateKey] = [];
          goalsByDate[dateKey].push({ status: goal.status });
        });

        // 날짜별 성공률 계산
        Object.entries(goalsByDate).forEach(([date, goals]) => {
          const total = goals.length;
          const successCount = goals.filter(
            (g) => g.status === "success",
          ).length;
          const rate =
            total === 0 ? 0 : Math.round((successCount / total) * 100);

          m[date] = {
            rate,
            hasRetro: retroSet.has(date),
          };
        });

        console.log("📅 달력 성공률 계산 (한국 시간 기준):", {
          총날짜수: Object.keys(m).length,
          날짜별데이터: Object.entries(m)
            .slice(0, 5)
            .map(([date, data]) => ({
              date,
              rate: data.rate,
              hasRetro: data.hasRetro,
            })),
          goalsByDate: Object.entries(goalsByDate).map(([date, goals]) => ({
            date,
            goalCount: goals.length,
            statuses: goals.map((g) => g.status),
          })),
        });

        setMeta(m);
        setLoading(false);
      } catch (error) {
        console.error("❌ 달력 데이터 로딩 실패:", error);
        setLoading(false);
        // 에러 발생 시에도 빈 상태로 화면 표시
        setMeta({});
      }
    })();
  }, []);

  /* ---------- 셀 렌더 ---------- */
  const dayComponent: CalendarProps["dayComponent"] = ({ date }) =>
    date ? (
      <Cell
        date={date}
        meta={meta[date.dateString]}
        onPress={(d) => nav.navigate("DayDetail", { date: d })}
      />
    ) : (
      <View style={styles.cell} />
    );

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={{ paddingTop: Math.max(insets.top, 44) }} />
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>기록 달력</Text>
      </View>

      <Calendar dayComponent={dayComponent} /* onDayPress 제거 */ />

      {/* 범례 */}
      <View style={styles.legendRow}>
        {[
          { txt: "Unlucky ≤30%", color: "crimson" },
          { txt: "SoSo 30-69%", color: "#E67E22" },
          { txt: "Good 70-99%", color: "seagreen" },
          { txt: "Trans 100%", color: "#1E3A8A" },
        ].map((l) => (
          <View key={l.txt} style={styles.legendBox}>
            <View style={[styles.legendSwatch, { backgroundColor: l.color }]} />
            <Text style={styles.legendLabel}>{l.txt}</Text>
          </View>
        ))}
      </View>

      {/* 통계 분석 버튼 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.statisticsButton}
          onPress={() => nav.navigate("Statistics")}
        >
          <Text style={styles.statisticsButtonText}>📊 성장 분석 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ───────── 스타일 ───────── */
const CELL = Platform.OS === "web" ? 46 : 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 15 },
  dim: { color: "#ccc" },
  labelText: { fontSize: 9, marginTop: 1 },
  retroDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E67E22",
    marginTop: 1,
  },

  legendRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
  },
  legendBox: { flexDirection: "row", alignItems: "center" },
  legendSwatch: { width: 10, height: 10, borderRadius: 2, marginRight: 4 },
  legendLabel: { fontSize: 12 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  buttonContainer: {
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  statisticsButton: {
    backgroundColor: "#4CAF50",
    marginTop: 20,
    marginLeft: 75,
    marginRight: 75,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  statisticsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
