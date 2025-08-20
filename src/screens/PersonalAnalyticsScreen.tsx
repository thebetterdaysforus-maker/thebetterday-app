import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAnalyticsStore } from "../store/analyticsStore";
import { useMotivationMessageStore } from "../store/motivationMessageStore";

const PersonalAnalyticsScreen: React.FC = () => {
  console.log("🚨🚨🚨 PersonalAnalyticsScreen 컴포넌트 렌더링됨!!!");
  const {
    statistics,
    hourlyStats,
    dailyStats,
    adminInsights,
    loading,
    calculateStatistics,
    fetchHourlyStats,
    fetchDailyStats,
    fetchAdminInsights,
    updateStatistics,
    getBestTimeSlot,
    getBestDay,
  } = useAnalyticsStore();

  const { currentMessage, fetchMessages, getTodaysMotivationMessage } =
    useMotivationMessageStore();

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    console.log("🔥 PersonalAnalyticsScreen useEffect 실행");
    loadAllData();
  }, []);

  const loadAllData = async () => {
    console.log("🔥 loadAllData 시작 - calculateStatistics 호출");
    try {
      await calculateStatistics();
      console.log("✅ calculateStatistics 완료");
      await Promise.all([
        fetchHourlyStats(),
        fetchDailyStats(),
        fetchAdminInsights(),
      ]);
      // 동기부여 메시지 데이터 업데이트
      await fetchMessages();
      await getTodaysMotivationMessage();
      console.log("✅ loadAllData 모든 작업 완료");
    } catch (error) {
      console.error("❌ loadAllData 오류:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    console.log("📊 PersonalAnalyticsScreen: onRefresh 시작");
    console.log("🔥 강제 연속 기록 계산 실행...");
    await calculateStatistics();
    await fetchAdminInsights();
    console.log(
      "📊 PersonalAnalyticsScreen: onRefresh 완료, 통계:",
      statistics,
    );
    setRefreshing(false);
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    return days[dayOfWeek];
  };

  if (loading && !statistics) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>분석 중...</Text>
      </View>
    );
  }

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={{ paddingTop: insets.top }} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 개인 통계 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 나의 성장 분석</Text>

          {statistics && (
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.primaryCard]}>
                <Text style={styles.statNumber}>{statistics.successRate}%</Text>
                <Text style={styles.statLabel}>전체 성공률</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{statistics.totalGoals}</Text>
                <Text style={styles.statLabel}>총 목표 수</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {statistics.currentStreak}
                </Text>
                <Text style={styles.statLabel}>연속 성공</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{statistics.bestStreak}</Text>
                <Text style={styles.statLabel}>최고 기록</Text>
              </View>
            </View>
          )}
        </View>

        {/* 최고 성과 시간대 */}
        {statistics && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎯 나의 최고 성과</Text>

            {statistics.successGoals === 0 ? (
              <View style={styles.noDataContainer}>
                <Text style={styles.noDataText}>
                  분석할 데이터가 부족합니다.
                </Text>
                <Text style={styles.noDataSubText}></Text>
              </View>
            ) : (
              <View style={styles.performanceGrid}>
                <View style={styles.performanceCard}>
                  <Text style={styles.performanceLabel}>최고 시간대</Text>
                  <Text style={styles.performanceValue}>
                    {getBestTimeSlot()}
                  </Text>
                  <Text style={styles.performanceDetail}>
                    {statistics.bestHour}시
                  </Text>
                </View>

                <View style={styles.performanceCard}>
                  <Text style={styles.performanceLabel}>최고 요일</Text>
                  <Text style={styles.performanceValue}>{getBestDay()}</Text>
                  <Text style={styles.performanceDetail}>성공률 높음</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* 시간대별 성과 차트 */}
        {hourlyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 시간대별 성과</Text>
            <View style={styles.chartContainer}>
              {hourlyStats.map((stat, index) => (
                <View key={index} style={styles.chartItem}>
                  <Text style={styles.chartLabel}>{stat.hour}시</Text>
                  <View style={styles.chartBar}>
                    <View
                      style={[
                        styles.chartBarFill,
                        { width: `${stat.successRate}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.chartValue}>{stat.successRate}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 요일별 성과 차트 */}
        {dailyStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 요일별 성과</Text>
            <View style={styles.weeklyChart}>
              {dailyStats.map((stat, index) => (
                <View key={index} style={styles.weeklyItem}>
                  <Text style={styles.weeklyLabel}>
                    {getDayName(stat.dayOfWeek)}
                  </Text>
                  <View style={styles.weeklyBar}>
                    <View
                      style={[
                        styles.weeklyBarFill,
                        { height: `${stat.successRate}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.weeklyValue}>{stat.successRate}%</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 관리자 인사이트 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 승리를 위한 꿀팁!</Text>
          {adminInsights.map((insight, index) => (
            <View key={insight.id} style={styles.adminInsightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightIcon}>
                  {insight.insightType === "pattern"
                    ? "📊"
                    : insight.insightType === "tip"
                      ? "💡"
                      : "📈"}
                </Text>
                <Text style={styles.adminInsightTitle}>{insight.title}</Text>
              </View>
              <Text style={styles.insightDescription}>
                {insight.description}
              </Text>
            </View>
          ))}
        </View>

        {/* 동기부여 섹션 */}
        {currentMessage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{currentMessage.title}</Text>
            <View style={styles.motivationCard}>
              <View style={styles.characterSection}>
                <View style={styles.characterContent}>
                  <Text style={styles.motivationMessage}>
                    {currentMessage.message}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  primaryCard: {
    backgroundColor: "#e3f2fd",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1976d2",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  // 동기부여 섹션 스타일
  motivationCard: {
    backgroundColor: "#aff0e0",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#42a88f",
  },
  characterSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  characterIcon: {
    width: 50,
    height: 50,
    backgroundColor: "#fff",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  characterContent: {
    flex: 1,
  },
  motivationMessage: {
    fontSize: 15,
    color: "#555",
    lineHeight: 18,
  },

  performanceGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  performanceCard: {
    width: "48%",
    backgroundColor: "#fff3e0",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  performanceLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff9800",
  },
  performanceDetail: {
    fontSize: 10,
    color: "#999",
    marginTop: 2,
  },
  chartContainer: {
    marginTop: 8,
  },
  chartItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  chartLabel: {
    width: 40,
    fontSize: 12,
    color: "#666",
  },
  chartBar: {
    flex: 1,
    height: 20,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    marginHorizontal: 8,
  },
  chartBarFill: {
    height: "100%",
    backgroundColor: "#4caf50",
    borderRadius: 4,
    minWidth: 2,
  },
  chartValue: {
    width: 40,
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
  weeklyChart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    marginTop: 8,
  },
  weeklyItem: {
    alignItems: "center",
    flex: 1,
  },
  weeklyLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  weeklyBar: {
    width: 20,
    height: 80,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    justifyContent: "flex-end",
  },
  weeklyBarFill: {
    width: "100%",
    backgroundColor: "#2196f3",
    borderRadius: 4,
    minHeight: 2,
  },
  weeklyValue: {
    fontSize: 10,
    color: "#666",
    marginTop: 4,
  },
  adminInsightCard: {
    backgroundColor: "#f3e5f5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#9c27b0",
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  adminInsightTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: "#555",
    lineHeight: 20,
  },
  noDataContainer: {
    backgroundColor: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  noDataText: {
    fontSize: 16,
    color: "#6c757d",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "500",
  },
  noDataSubText: {
    fontSize: 14,
    color: "#adb5bd",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default PersonalAnalyticsScreen;
