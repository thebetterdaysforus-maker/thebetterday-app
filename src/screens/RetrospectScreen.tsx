// src/screens/RetrospectScreen.tsx
import React, { useLayoutEffect, useState } from "react";
import {
  Alert,
  Keyboard,
  Text,
  TextInput,
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import useRetrospectStore from "../store/retrospectStore";
import useGoalStore from "../store/goalStore";
import { format } from "date-fns";

export default function RetrospectScreen({ navigation }: any) {
  const [txt, setTxt] = useState("");
  const save = useRetrospectStore((s) => s.saveRetrospect);
  const { getTodaySummary, goals } = useGoalStore();

  const { allDone, hasFailure } = getTodaySummary();

  // 오늘의 실패한 목표들 가져오기
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const failedGoals = goals.filter((goal) => {
    const goalDate = format(new Date(goal.target_time), "yyyy-MM-dd");
    return goalDate === todayStr && goal.status === "failure";
  });

  const motivationalMessage = hasFailure
    ? "실패는 성공의 어머니입니다. 내일은 더 나은 하루를 만들어보세요! 💪"
    : "모든 목표를 달성하셨군요! 정말 대단합니다! 🎉";

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

  /* 헤더 버튼 */
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Text
          style={{ marginRight: 12, color: "#007AFF", fontSize: 16 }}
          onPress={onSave}
        >
          저장
        </Text>
      ),
    });
  }, [navigation, txt]);

  return (
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
                {format(new Date(goal.target_time), "HH:mm")}
              </Text>
              <Text style={styles.failedGoalTitle}>{goal.title}</Text>
            </View>
          ))}
          <Text style={styles.failedGoalsNote}>
            패배는 그저 승리의 발판입니다!
          </Text>
        </View>
      )}

      <View style={styles.motivationBox}>
        <Text style={styles.motivationText}>{motivationalMessage}</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>오늘의 회고</Text>
        <TextInput
          style={styles.textInput}
          placeholder="오늘 하루 어땠나요? 부담없이 이야기해보세요!"
          placeholderTextColor="rgba(235, 181, 181, 0.7)"
          multiline
          value={txt}
          onChangeText={setTxt}
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
  },
  failedGoalsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#c0392b",
    marginBottom: 12,
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
  failedGoalsNote: {
    fontSize: 12,
    color: "#7f8c8d",
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
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
