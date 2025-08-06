import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { v4 as uuidv4 } from "uuid";
import useGoalStore from "../store/goalStore";
import CustomTimePicker from "../components/CustomTimePicker";

/* ───────────────── 타입 ───────────────── */
interface TempGoal {
  id: string; // 로컬 키
  time: string; // ISO(30분 간격)
  title: string; // 입력 내용
}

/* ───────────────── 컴포넌트 ───────────────── */
export default function GoalBatchScreen({ route }: any) {
  // useNavigation hook 사용
  const navigation = useNavigation() as any;
  /* TimeSelect → GoalBatch 첫 진입(선택 직후) */
  const firstTime: string | undefined = route.params?.prefilledTime;
  // 🔥 "내일 우선" 로직: 기본값을 "tomorrow"로 설정
  const isTomorrowMode = route.params?.initial !== "today"; // "today"가 아니면 모두 내일 모드

  /* ① 임시 목록 상태 - 빈 화면에서 시작 */
  const [tempGoals, setTempGoals] = useState<TempGoal[]>(
    firstTime ? [{ id: uuidv4(), time: firstTime, title: "" }] : [],
  );

  /* 시간 선택 모달 상태 */
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [isTimeValid, setIsTimeValid] = useState<boolean>(true);

  /* ② 제목 변경 */
  const changeTitle = (id: string, text: string) =>
    setTempGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, title: text } : g)),
    );

  /* ③ 행 삭제 - 내일 모드일 때 5개 미만으로 삭제 방지 */
  const removeRow = (id: string) => {
    if (isTomorrowMode && tempGoals.length <= 5) {
      Alert.alert("삭제 불가", "내일 목표는 최소 5개 이상 유지해야 합니다.");
      return;
    }
    setTempGoals((prev) => prev.filter((g) => g.id !== id));
  };

  /* ④ '＋' → 시간 선택 모달 열기 */
  const openTimePicker = () => {
    // 기본값 설정 (내일 모드면 내일 시간, 아니면 현재 시간 + 3시간)
    const defaultTime = isTomorrowMode
      ? (() => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0); // 내일 오전 9시로 기본 설정
          return tomorrow;
        })()
      : (() => {
          // 🔥 한국 시간 기준으로 3시간 후 계산
          const koreaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
          const futureTime = new Date(koreaTime.getTime() + 3 * 60 * 60 * 1000); // 3시간 후
          const roundedMinutes = Math.ceil(futureTime.getMinutes() / 30) * 30;
          if (roundedMinutes >= 60) {
            futureTime.setHours(futureTime.getHours() + 1);
            futureTime.setMinutes(0);
          } else {
            futureTime.setMinutes(roundedMinutes);
          }
          futureTime.setSeconds(0, 0);
          
          console.log("📅 GoalBatchScreen 기본 시간 계산:", {
            현재한국시간: koreaTime.toLocaleString('ko-KR'),
            계산결과: futureTime.toLocaleString('ko-KR')
          });
          
          return futureTime;
        })();

    console.log("📅 시간 선택 모달 열기:", {
      isTomorrowMode,
      defaultTime: defaultTime.toLocaleString("ko-KR"),
      date: defaultTime.toLocaleDateString("ko-KR"),
    });

    setSelectedTime(defaultTime);
    setIsTimePickerVisible(true);
  };

  /* 시간 선택 확인 */
  const confirmTimeSelection = () => {
    if (!isTimeValid) {
      // 유효하지 않은 시간일 때는 그냥 무시 (UI에서 이미 표시됨)
      return;
    }

    // 내일 모드일 때 날짜 재확인
    const finalTime = new Date(selectedTime);
    if (isTomorrowMode) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      finalTime.setFullYear(tomorrow.getFullYear());
      finalTime.setMonth(tomorrow.getMonth());
      finalTime.setDate(tomorrow.getDate());
    }

    console.log("⏰ 목표 시간 추가:", {
      isTomorrowMode,
      selectedTime: selectedTime.toLocaleString("ko-KR"),
      finalTime: finalTime.toLocaleString("ko-KR"),
      date: finalTime.toLocaleDateString("ko-KR"),
    });

    const selectedTimeISO = finalTime.toISOString();

    // 새 목표 추가
    const newGoal: TempGoal = {
      id: uuidv4(),
      time: selectedTimeISO,
      title: "",
    };

    setTempGoals((prev) =>
      [...prev, newGoal].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      ),
    );

    setIsTimePickerVisible(false);
  };

  /* ⑤ 목표 저장 처리 */
  const { addGoalsBatch, goals } = useGoalStore();

  /* ⑥ "완료" → addGoalsBatch 로 서버 저장 */
  const onFinish = async () => {
    // 내일 모드일 때는 5개 이상, 오늘 모드일 때는 5개 이상 필요
    const minimumGoals = 5;
    if (tempGoals.length < minimumGoals) {
      Alert.alert("안내", `목표를 최소 ${minimumGoals}개 이상 작성해 주세요.`);
      return;
    }
    if (tempGoals.some((g) => !g.title.trim())) {
      Alert.alert("안내", "빈 제목이 있습니다.");
      return;
    }

    /* 최종 ±30분 범위 충돌 체크 */
    const thirtyMinutes = 30 * 60 * 1000;

    console.log("🔍 충돌 검사 시작:", {
      tempGoals: tempGoals.length,
      existingGoals: (goals || []).length,
      tempGoalTimes: tempGoals.map(g => ({
        title: g.title,
        local: new Date(g.time).toLocaleTimeString('ko-KR'),
        date: new Date(g.time).toLocaleDateString('ko-KR'),
        utc: g.time,
        timestamp: new Date(g.time).getTime()
      })),
      existingGoalTimes: (goals || []).map(g => ({
        title: g.title,
        local: new Date(g.target_time).toLocaleTimeString('ko-KR'),
        date: new Date(g.target_time).toLocaleDateString('ko-KR'),
        utc: g.target_time,
        timestamp: new Date(g.target_time).getTime()
      }))
    });

    for (const tempGoal of tempGoals) {
      const tempTime = new Date(tempGoal.time).getTime();
      
      // 현재 시간대 기준으로 날짜 비교
      const tempDateLocal = new Date(tempGoal.time).toLocaleDateString();

      // 같은 날짜의 기존 목표와만 충돌 체크 (현재 시간대 기준)
      const sameDayGoals = (goals || []).filter(g => {
        const goalDateLocal = new Date(g.target_time).toLocaleDateString();
        return goalDateLocal === tempDateLocal;
      });

      console.log("📅 같은 날짜 목표 필터링 (현재시간대):", {
        tempGoalTitle: tempGoal.title,
        tempGoalDate: tempDateLocal,
        tempGoalTime: new Date(tempGoal.time).toLocaleString(),
        tempGoalUTC: tempGoal.time,
        sameDayGoalsCount: sameDayGoals.length,
        sameDayGoals: sameDayGoals.map(g => ({
          title: g.title,
          time: new Date(g.target_time).toLocaleString(),
          date: new Date(g.target_time).toLocaleDateString(),
          utc: g.target_time
        }))
      });

      const conflictingExisting = sameDayGoals.find((g) => {
        const goalTime = new Date(g.target_time).getTime();
        const timeDiff = Math.abs(tempTime - goalTime);
        const isConflict = timeDiff < thirtyMinutes;
        
        console.log("⏰ 시간 충돌 검사:", {
          tempGoalTitle: tempGoal.title,
          tempGoal: new Date(tempGoal.time).toLocaleTimeString('ko-KR'),
          existingGoalId: g.id,
          existingGoalTitle: g.title,
          existingGoal: new Date(g.target_time).toLocaleTimeString('ko-KR'),
          timeDiffMinutes: Math.round(timeDiff / (60 * 1000)),
          isConflict
        });
        
        return isConflict;
      });

      if (conflictingExisting) {
        const conflictTimeStr = new Date(conflictingExisting.target_time)
          .toLocaleTimeString("ko-KR", {
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace("AM", "오전")
          .replace("PM", "오후");

        console.log("❌ 기존 목표와 충돌 발견 - 저장 차단:", {
          tempGoalTitle: tempGoal.title,
          tempGoalTime: new Date(tempGoal.time).toLocaleTimeString('ko-KR'),
          conflictingGoalTitle: conflictingExisting.title,
          conflictingGoalTime: conflictTimeStr,
          timeDiffMinutes: Math.round(Math.abs(tempTime - new Date(conflictingExisting.target_time).getTime()) / (60 * 1000))
        });
        // 내일 모드에서는 30분 제한 알림 표시 안함 (배치 모드는 대부분 내일 모드)
        console.log("✅ 배치 모드 - 30분 제한 알림 건너뜀 (충돌 허용)");
        // 알림은 표시하지 않지만 로그는 남김
        console.log("⚠️ 30분 충돌이지만 배치 모드에서 허용:", {
          newGoal: tempGoal.title,
          conflictingGoal: conflictingExisting.title,
          timeDiff: Math.round(Math.abs(tempTime - new Date(conflictingExisting.target_time).getTime()) / (60 * 1000)) + "분"
        });
      }

      // 임시 목표들 간의 충돌 체크
      const conflictingTemp = tempGoals.find((g) => {
        if (g.id === tempGoal.id) return false; // 자기 자신 제외
        const goalTime = new Date(g.time).getTime();
        const timeDiff = Math.abs(tempTime - goalTime);
        const isConflict = timeDiff < thirtyMinutes;
        
        if (isConflict) {
          console.log("⚠️ 임시 목표 간 충돌 발견:", {
            tempGoal1: new Date(tempGoal.time).toLocaleTimeString('ko-KR'),
            tempGoal2: new Date(g.time).toLocaleTimeString('ko-KR'),
            timeDiffMinutes: Math.round(timeDiff / (60 * 1000))
          });
        }
        
        return isConflict;
      });

      if (conflictingTemp) {
        const tempTimeStr = new Date(tempGoal.time)
          .toLocaleTimeString("ko-KR", {
            hour12: true,
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace("AM", "오전")
          .replace("PM", "오후");

        console.log("❌ 임시 목표 간 충돌 발견 - 저장 차단");
        // 배치 모드에서는 30분 제한 알림 표시 안함
        console.log("✅ 배치 모드 - 임시 목표 30분 제한 알림 건너뜀");
        // 알림은 표시하지 않지만 로그는 남김
        console.log("⚠️ 임시 목표 30분 충돌이지만 배치 모드에서 허용:", {
          time: tempTimeStr,
          conflictingTime: new Date(conflictingTemp.time).toLocaleTimeString('ko-KR')
        });
      }
    }

    try {
      // 내일 모드일 때 날짜를 내일로 명시적으로 설정
      const goalsToSave = tempGoals.map((g) => {
        const targetTime = new Date(g.time);

        if (isTomorrowMode) {
          // 내일 날짜로 명시적 설정
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          targetTime.setFullYear(tomorrow.getFullYear());
          targetTime.setMonth(tomorrow.getMonth());
          targetTime.setDate(tomorrow.getDate());
        }

        return {
          title: g.title.trim(),
          target_time: targetTime.toISOString(),
        };
      });

      console.log("🚀 목표 저장:", {
        isTomorrowMode,
        goalsToSave: goalsToSave.map((g) => ({
          title: g.title,
          date: new Date(g.target_time).toLocaleDateString("ko-KR"),
          time: new Date(g.target_time).toLocaleTimeString("ko-KR"),
        })),
      });

      await addGoalsBatch(goalsToSave);
      
      // 저장 후 목표 데이터 강제 새로고침
      const { fetchGoals } = useGoalStore.getState();
      await fetchGoals();
      
      console.log("🔘 GoalBatch 저장 완료 - 목표 데이터 새로고침 완료");

      console.log("🔘 GoalBatch 저장 완료 - navigation 상태:", {
        navigation: !!navigation,
        navigate: !!navigation?.navigate,
        reset: !!navigation?.reset,
      });

      if (!navigation) {
        console.error("❌ GoalBatch: navigation이 null입니다!");
        return;
      }

      if (!navigation.reset) {
        console.error("❌ GoalBatch: navigation.reset이 존재하지 않습니다!");
        return;
      }

      try {
        console.log("🚀 GoalList로 reset 이동");
        navigation.reset({ index: 0, routes: [{ name: "GoalList" }] });
      } catch (error) {
        console.error("❌ GoalBatch reset 호출 중 오류:", error);
      }
    } catch (e: any) {
      Alert.alert("에러", e.message);
    }
  };

  /* ──────────────── UI ──────────────── */
  return (
    <View style={styles.container}>
      <FlatList
        data={tempGoals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.time}>
              {new Date(item.time)
                .toLocaleTimeString("ko-KR", {
                  hour12: true,
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace("AM", "오전")
                .replace("PM", "오후")}
            </Text>

            <TextInput
              placeholder="내일은... 무엇을 하고자 하시나요?"
              placeholderTextColor="#999"
              value={item.title}
              onChangeText={(t) => changeTitle(item.id, t)}
              style={styles.input}
            />

            <TouchableOpacity onPress={() => removeRow(item.id)}>
              <Text style={styles.del}>삭제</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 32 }}>
            <Text style={{ textAlign: "center", fontSize: 16, color: "#666" }}>
              "＋" 버튼을 눌러 목표를 추가하세요
            </Text>
            <Text
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "#e74c3c",
                marginTop: 12,
                fontWeight: "500",
              }}
            >
              ⚠️ 목표 간격은 최소 30분 이상 유지해주세요
            </Text>
          </View>
        }
      />

      {/* 하단 버튼 */}
      <View style={styles.bottom}>
        <Button title="＋ 목표 추가" onPress={openTimePicker} />
        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#e74c3c",
            marginTop: 8,
            marginBottom: 4,
            fontWeight: "500",
          }}
        ></Text>
        <View style={{ height: 8 }} />
        <Button
          title="완료"
          onPress={onFinish}
          disabled={tempGoals.length < 5}
        />
      </View>

      {/* 시간 선택 모달 */}
      <Modal
        visible={isTimePickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsTimePickerVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>시간 선택</Text>
            <TouchableOpacity
              onPress={confirmTimeSelection}
              style={[
                styles.confirmButton,
                !isTimeValid && styles.disabledButton,
              ]}
              disabled={!isTimeValid}
            >
              <Text
                style={[
                  styles.confirmText,
                  !isTimeValid && styles.disabledText,
                ]}
              >
                확인
              </Text>
            </TouchableOpacity>
          </View>

          <CustomTimePicker
            value={selectedTime}
            onChange={setSelectedTime}
            onValidityChange={setIsTimeValid}
            isTomorrowMode={isTomorrowMode}
            conflictingTimes={[
              ...tempGoals.map((g) => new Date(g.time)),
              ...goals.map((g) => new Date(g.target_time)),
            ]}
          />
        </View>
      </Modal>
    </View>
  );
}

/* ──────────────── 스타일 ──────────────── */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8,
  },
  time: {
    fontSize: 13,
    fontWeight: "bold",
    width: 80,
    color: "#333",
  },
  input: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 14,
    minHeight: 44,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  del: {
    color: "#E53935",
    marginLeft: 8,
    fontSize: 14,
  },
  bottom: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1d1d1f",
  },
  cancelButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelText: {
    fontSize: 16,
    color: "#007AFF",
  },
  confirmButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: "#999999",
  },
});
