import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CommonActions, StackActions } from "@react-navigation/native";
import useGoalStore from "../store/goalStore";
import {
  getTodayKorea,
  getTomorrowKorea,
  formatDateKorea,
} from "../utils/timeUtils";

/* ───────────────── 유틸리티 ───────────────── */
const isValidTitle = (title: string): boolean => {
  const regex = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]{1,40}$/;
  return regex.test(title);
};

/* ───────────────── 컴포넌트 ───────────────── */
export default function GoalDetailScreen({ route, navigation }: any) {
  const { goalId, prefilledTime, batch } = route.params;
  const { goals, addGoal, updateGoal, deleteGoal } = useGoalStore();

  /* 목표 정보 */
  const [title, setTitle] = useState("");
  const [targetTime, setTargetTime] = useState(prefilledTime || "");
  const [inputErr, setInputErr] = useState(false);

  /* 편집 모드 확인 */
  const existing = goals.find((g: any) => g.id === goalId);

  /* 편집 모드 시간 동기화 */
  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setTargetTime(existing.target_time);
    }
  }, [existing]);

  /* 시간 재설정 후 돌아올 때 업데이트된 시간 반영 */
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      // TimeSelect에서 돌아온 경우 업데이트된 시간 반영
      if (route.params?.updatedTime) {
        console.log("🔄 시간 재설정 완료:", route.params.updatedTime);
        setTargetTime(route.params.updatedTime);
        // 파라미터 정리 (다음번 focus에서 중복 실행 방지)
        navigation.setParams({ updatedTime: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route.params]);

  /* 안전 복귀 (단건 모드 전용) */
  const backToList = () => {
    const depth = navigation.getState().routes.length;
    if (prefilledTime && depth >= 3) {
      navigation.dispatch(StackActions.pop(2)); // TimeSelect + GoalDetail 제거
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("GoalList");
    }
  };

  /* 입력 핸들러 */
  const handleChange = (txt: string) => {
    if (txt.length > 40) return;
    setTitle(txt);
    setInputErr(!isValidTitle(txt) && txt.length > 0);
  };

  /* 저장 버튼 */
  const handleSave = async () => {
    const trimmed = title.trim();
    if (!isValidTitle(trimmed)) {
      Alert.alert("입력 확인", "특수문자 없이 40자 이내로 작성해 주세요.");
      return;
    }

    /* ① 배치 모드 ─ TimeSelect·GoalDetail 두 화면 pop 후 GoalBatch 로 병합 이동 */
    if (batch) {
      /* 스택:  GoalBatch ▸ TimeSelect ▸ GoalDetail(현재)  */
      navigation.dispatch(StackActions.pop(2)); // TimeSelect + GoalDetail 제거

      navigation.dispatch(
        CommonActions.navigate({
          name: "GoalBatch",
          params: { newGoal: { time: targetTime, title: trimmed } },
          merge: true,
        }),
      );
      return;
    }

    /* ② 단건 모드 ─ DB 반영 */
    try {
      // ±30분 범위 충돌 체크
      const selectedTime = new Date(targetTime).getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      // 같은 날짜의 목표들만 필터링 (현재 시간대 기준)
      const selectedDateLocal = new Date(targetTime).toLocaleDateString();
      const sameDayGoals = goals.filter((g) => {
        const goalDateLocal = new Date(g.target_time).toLocaleDateString();
        return goalDateLocal === selectedDateLocal;
      });

      console.log("📅 GoalDetailScreen 같은 날짜 필터링 (현재시간대):", {
        selectedDate: selectedDateLocal,
        selectedTime: new Date(targetTime).toLocaleString(),
        totalGoals: goals.length,
        sameDayGoals: sameDayGoals.length,
        sameDayGoalTimes: sameDayGoals.map((g) =>
          new Date(g.target_time).toLocaleString(),
        ),
      });

      const conflictingGoal = sameDayGoals.find((g) => {
        // 본인 목표는 제외 (수정 시)
        if (g.id === goalId) return false;

        const goalTime = new Date(g.target_time).getTime();
        const timeDiff = Math.abs(selectedTime - goalTime);
        const isConflict = timeDiff < thirtyMinutes;

        console.log("⏰ GoalDetailScreen 충돌 체크:", {
          existingGoal: new Date(g.target_time).toLocaleTimeString("ko-KR"),
          timeDiffMinutes: Math.round(timeDiff / (60 * 1000)),
          isConflict,
        });

        return isConflict;
      });

      if (conflictingGoal) {
        const conflictTimeStr = new Date(conflictingGoal.target_time)
          .toLocaleTimeString("ko-KR", {
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace("AM", "오전")
          .replace("PM", "오후");

        // 내일 모드에서는 30분 제한 알림 표시 안함
        const isTomorrowMode = route.params?.batch === false; // batch가 false면 내일 모드
        if (!isTomorrowMode) {
          Alert.alert(
            "시간 설정 제한",
            `${conflictTimeStr}에 설정된 목표와 너무 가깝습니다.\n\n` +
              "목표 간격은 최소 30분 이상 유지해주세요.",
          );
          return;
        } else {
          console.log("✅ 내일 모드 - 30분 제한 알림 건너뜀");
        }
      }

      if (existing) {
        await updateGoal(goalId, {
          title: trimmed,
          target_time: targetTime,
        });
        console.log('✅ 목표 수정 완료 - 홈 화면으로 이동');
      } else {
        await addGoal(trimmed, targetTime);
        console.log('✅ 목표 추가 완료 - 홈 화면으로 이동');
      }
      
      // 강제 화면 이동 보장
      setTimeout(() => {
        backToList();
      }, 100);
    } catch (e: any) {
      Alert.alert(
        "저장 실패",
        e.message || "목표 저장 중 오류가 발생했습니다.",
      );
    }
  };

  /* 삭제 (단건 모드 전용) */
  const handleDelete = () =>
    Alert.alert("삭제 확인", "정말 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(goalId);
            backToList();
          } catch (e: any) {
            Alert.alert(
              "삭제 실패",
              e.message || "목표 삭제 중 오류가 발생했습니다.",
            );
          }
        },
      },
    ]);

  /* ───────── UI ───────── */
  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>
        {existing ? "수행 목록 수정" : batch ? "수행 목록 작성" : "수행 목록 추가"}
      </Text>

      {/* 선택된 시간 */}
      <Text style={styles.timeText}>
        {new Date(targetTime)
          .toLocaleTimeString("ko-KR", {
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace("AM", "오전")
          .replace("PM", "오후")}
      </Text>

      {/* 시간 재설정 버튼 (편집 모드에서 항상 표시) */}
      {(existing || !batch) && (
        <>
          <TouchableOpacity
            style={styles.timeResetButton}
            onPress={() => {
              // 기존 목표 편집 시 시간 재설정
              if (existing) {
                // 한국 시간 기준으로 내일 목표인지 확인
                const goalDate = new Date(existing.target_time);
                const koreanDate = new Date(
                  goalDate.getTime() + 9 * 60 * 60 * 1000,
                );
                const now = new Date();
                const koreaTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
                const tomorrowKey = new Date(koreaTime.getTime() + 86400000)
                  .toISOString()
                  .slice(0, 10);
                const goalDateKey = koreanDate.toISOString().slice(0, 10);

                const isTomorrow = goalDateKey === tomorrowKey;

                navigation.navigate("TimeSelect", {
                  goalId: goalId,
                  currentTime: targetTime,
                  initial: isTomorrow ? "tomorrow" : "today",
                });
              } else {
                // 수행 목록 추가 시
                navigation.navigate("TimeSelect", {
                  goalId: goalId,
                  currentTime: targetTime,
                });
              }
            }}
          >
            <Text style={styles.timeResetButtonText}>시간 재설정</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </>
      )}

      <TextInput
        placeholder="무엇을 하고자 하시나요?"
        placeholderTextColor="#999"
        value={title}
        maxLength={40}
        onChangeText={handleChange}
        style={[
          styles.textInput,
          { borderColor: inputErr ? "#E53935" : "#ccc" },
        ]}
      />

      {inputErr && (
        <Text style={styles.errorText}>
          특수문자 없이 40자 이내로 작성해 주세요.
        </Text>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>저장</Text>
      </TouchableOpacity>

      {/* 단건 모드의 편집 시에만 삭제 버튼 표시 */}
      {existing && !batch && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>삭제</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1D1D1F",
    marginBottom: 20,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "500",
    color: "#333",
    marginBottom: 20,
  },
  textInput: {
    borderBottomWidth: 1,
    fontSize: 16,
    paddingVertical: 12,
    marginBottom: 8,
    color: "#1D1D1F",
  },
  errorText: {
    color: "#E53935",
    fontSize: 12,
    marginBottom: 20,
  },
  timeResetButton: {
    backgroundColor: "#F8F9FA",
    borderWidth: 2,
    borderColor: "#7B68EE",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 24,
    shadowColor: "#7B68EE",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeResetButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#7B68EE",
    letterSpacing: 0.2,
  },
  saveButton: {
    backgroundColor: "#7B68EE",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    shadowColor: "#7B68EE",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  deleteButton: {
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    marginTop: 20,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});
