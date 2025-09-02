// src/screens/RetrospectScreen.tsx
import React, { useState } from "react";
import {
  Alert,
  Keyboard,
  Text,
  TextInput,
  View,
  StyleSheet,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useRetrospectStore from "../store/retrospectStore";
import useGoalStore from "../store/goalStore";
// date-fns 제거하고 네이티브 Date 사용

export default function RetrospectScreen({ navigation }: any) {
  const [txt, setTxt] = useState("");
  const save = useRetrospectStore((s) => s.saveRetrospect);
  const { getTodaySummary, goals } = useGoalStore();

  // 한국 시간 기준으로 오늘의 실패한 목표들 직접 계산
  const today = new Date();
  const koreaTime = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  const todayStr = koreaTime.toISOString().split("T")[0]; // YYYY-MM-DD

  const todayGoals = goals.filter((goal) => {
    const goalDate = new Date(goal.target_time);
    const goalKoreaTime = new Date(goalDate.getTime() + 9 * 60 * 60 * 1000);
    return goalKoreaTime.toISOString().split("T")[0] === todayStr;
  });

  const failedGoals = todayGoals.filter((goal) => goal.status === "failure");
  const hasFailure = failedGoals.length > 0;
  const allDone =
    todayGoals.length > 0 && todayGoals.every((g) => g.status !== "pending");

  console.log("🔍 회고 화면 목표 상태:", {
    오늘날짜: todayStr,
    전체목표: todayGoals.length,
    실패목표: failedGoals.length,
    실패여부: hasFailure,
    목표상태: todayGoals.map((g) => ({ title: g.title, status: g.status })),
  });

  // 완전승리 시에는 동기부여 메시지 생략, 실패 시에만 격려 메시지 표시
  const motivationalMessage = hasFailure
    ? "실패는 성공의 어머니입니다. \n 내일은 더 나은 하루를 만들어보세요! 💪"
    : null;

  /* 저장 */
  const onSave = async () => {
    const body = txt.trim();
    if (!body) return Alert.alert("내용을 입력해 주세요");
    try {
      await save(body);
      Alert.alert("저장 완료", "오늘의 회고가 저장되었습니다. 내일도 화이팅!");
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("에러", e.message);
    }
  };

  // 헤더가 숨겨져 있어서 useLayoutEffect 제거하고 화면 내부에 버튼 추가

  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={{ paddingTop: insets.top }} />
      
      {/* 헤더 영역 */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>오늘의 회고</Text>
        
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={onSave}
        >
          <Text style={[styles.headerButtonText, styles.saveButtonText]}>저장</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.container}>
        {/* 완전 승리 시 특별 메시지 */}
        {allDone && !hasFailure && (
          <View style={styles.victoryBox}>
            <Text style={styles.victoryTitle}>🎉 완전 승리! 🎉</Text>
            <Text style={styles.victoryMessage}>
              오늘 모든 목표를 달성하셨습니다! {"\n"} 정말 대단한 성취입니다.
            </Text>
          </View>
        )}

        {/* 패배한 목표 목록 */}
        {failedGoals.length > 0 && (
          <View style={styles.failedGoalsBox}>
            <Text style={styles.failedGoalsTitle}>⚠️ 패배한 목표들</Text>
            {failedGoals.map((goal) => (
              <View key={goal.id} style={styles.failedGoalItem}>
                <Text style={styles.failedGoalTime}>
                  {new Date(goal.target_time).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text style={styles.failedGoalTitle}>{goal.title}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 실패한 경우에만 동기부여 메시지 표시 */}
        {motivationalMessage && (
          <View style={styles.motivationBox}>
            <Text style={styles.motivationText}>{motivationalMessage}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>오늘의 회고</Text>
          <TextInput
            style={styles.textInput}
            placeholder="오늘 하루 어땠나요? 부담없이 이야기해주세요!"
            placeholderTextColor="rgba(235, 181, 181, 0.7)"
            multiline
            value={txt}
            onChangeText={setTxt}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },

  // 헤더 스타일
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  saveButtonText: {
    fontWeight: "600",
  },

  // 완전 승리 스타일
  victoryBox: {
    backgroundColor: "#fff5e6",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#ffd700",
    alignItems: "center",
  },
  victoryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#e67e22",
    marginBottom: 8,
  },
  victoryMessage: {
    fontSize: 16,
    color: "#d35400",
    textAlign: "center",
    lineHeight: 24,
  },

  // 패배한 목표 스타일
  failedGoalsBox: {
    backgroundColor: "#fff5f5",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  failedGoalsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c0392b",
    marginBottom: 10,
  },
  failedGoalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
  failedGoalTime: {
    fontSize: 14,
    color: "#7f8c8d",
    marginRight: 12,
    minWidth: 50,
  },
  failedGoalTitle: {
    flex: 1,
    fontSize: 14,
    color: "#2c3e50",
  },

  motivationBox: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#667eea",
  },
  motivationText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    textAlign: "center",
  },
  inputContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    minHeight: 200,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  textInput: {
    fontSize: 16,
    textAlignVertical: "top",
    lineHeight: 24,
    color: "#333",
    minHeight: 150,
  },
});
