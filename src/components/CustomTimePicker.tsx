// src/components/CustomTimePicker.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import useGoalStore from "../store/goalStore";

interface CustomTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  conflictingTimes?: Date[];
  goals?: any[]; // 목표 배열 직접 전달
  onValidityChange?: (isValid: boolean) => void;
  isTomorrowMode?: boolean;
  excludeGoalId?: string; // 편집 중인 목표 ID (충돌 검사에서 제외)
}

export default function CustomTimePicker({
  value,
  onChange,
  conflictingTimes = [],
  goals: propGoals,
  onValidityChange,
  isTomorrowMode = false,
  excludeGoalId,
}: CustomTimePickerProps) {
  const { goals: storeGoals, fetchGoals } = useGoalStore();
  
  // props로 전달된 goals가 있으면 사용, 없으면 store에서 가져옴  
  const goals = propGoals || storeGoals;

  // 컴포넌트 마운트 시 한 번만 목표 데이터 조회
  React.useEffect(() => {
    if (!goals || goals.length === 0) {
      console.log('🔄 CustomTimePicker에서 목표 데이터 강제 조회');
      fetchGoals().catch(console.error);
    }
  }, []); // fetchGoals 의존성 제거로 무한 루프 방지

  // 초기값은 선택되지 않은 상태로 시작
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [isPM, setIsPM] = useState<boolean | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const now = new Date();

  // 시간과 분 배열 생성
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  // 시간 업데이트
  const updateTime = (
    newHour: number | null,
    newMinute: number | null,
    newIsPM: boolean | null,
  ) => {
    // 시, 분, AM/PM 모두 선택되었을 때만 업데이트
    if (newHour !== null && newMinute !== null && newIsPM !== null) {
      const newDate = new Date(value); // 기존 날짜 유지
      const hour24 = newIsPM
        ? newHour === 12
          ? 12
          : newHour + 12
        : newHour === 12
          ? 0
          : newHour;
      newDate.setHours(hour24, newMinute, 0, 0);
      onChange(newDate);
    }
  };

  // 시간 검증 함수
  const isTimeValid = (
    checkHour: number | null,
    checkMinute: number | null,
    checkIsPM: boolean | null,
  ): boolean => {
    // 모든 값이 선택되지 않았으면 유효하지 않음
    if (checkHour === null || checkMinute === null || checkIsPM === null) {
      return false;
    }
    const testDate = new Date(value); // value의 날짜를 기준으로 생성
    const hour24 = checkIsPM
      ? checkHour === 12
        ? 12
        : checkHour + 12
      : checkHour === 12
        ? 0
        : checkHour;
    testDate.setHours(hour24, checkMinute, 0, 0);

    // 00:00:00 방지 (Date value out of bounds 오류 방지)
    if (hour24 === 0 && checkMinute === 0) {
      console.log("❌ CustomTimePicker 00:00:00 선택 차단");
      return false;
    }

    // 🔥 시간 제약 검사 - 내일 모드에서는 완전히 건너뜀
    console.log("🕐 CustomTimePicker 시간 제약 검사:", {
      isTomorrowMode,
      테스트시간: testDate.toLocaleString('ko-KR'),
      제약건너뜀: isTomorrowMode
    });
    
    if (!isTomorrowMode) {
      // 한국 시간 기준으로 당일 여부 확인
      const koreanNow = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      const testDateKorean = new Date(testDate.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
      
      // 같은 날짜인지 확인 (한국 시간 기준)
      const isSameDay = koreanNow.toDateString() === testDateKorean.toDateString();
      
      if (isSameDay) {
        const threeHoursFromNow = new Date(koreanNow.getTime() + 3 * 60 * 60 * 1000);
        if (testDateKorean < threeHoursFromNow) {
          console.log("❌ CustomTimePicker 3시간 제약 위반:", {
            테스트시간: testDateKorean.toLocaleString('ko-KR'),
            최소시간: threeHoursFromNow.toLocaleString('ko-KR')
          });
          return false;
        }
      } else {
        console.log("✅ CustomTimePicker 내일 시간이므로 3시간 제약 건너뜀");
      }
    } else {
      console.log("✅ CustomTimePicker 내일 모드 - 모든 시간 제약 완전 건너뜀");
    }

    // 30분 범위 충돌 체크 - DB 목표 + props로 전달된 충돌 시간들
    const thirtyMinutes = 30 * 60 * 1000;
    const testTime = testDate.getTime();

    // 디버그 로그 간소화 (성능 최적화)
    if (conflictingTimes?.length > 0 || goals?.length > 0) {
      console.log("🔍 CustomTimePicker 충돌 검사:", {
        전체목표수: goals?.length || 0,
        추가충돌시간수: conflictingTimes?.length || 0,
        테스트시간: testDate.toLocaleTimeString("ko-KR")
      });
    }
    
    // 1. DB 목표와의 충돌 검사 (편집 중인 목표는 제외, 같은 날짜만 비교)
    const selectedDateLocal = testDate.toLocaleDateString();
    const conflictingGoals = (goals || []).filter(goal => {
      // 편집 중인 목표는 제외
      if (excludeGoalId && goal.id === excludeGoalId) {
        console.log("🔄 편집 중인 목표 제외:", goal.id, new Date(goal.target_time).toLocaleTimeString("ko-KR"));
        return false;
      }
      
      // 같은 날짜의 목표만 비교 (중요!)
      const goalDateLocal = new Date(goal.target_time).toLocaleDateString();
      const isSameDate = goalDateLocal === selectedDateLocal;
      
      if (!isSameDate) {
        return false; // 다른 날짜면 충돌 검사 제외
      }
      
      return true;
    });

    console.log("🔍 CustomTimePicker 같은 날짜 필터링:", {
      선택날짜: selectedDateLocal,
      전체목표: (goals || []).length,
      같은날짜목표: conflictingGoals.length,
      테스트시간: testDate.toLocaleString('ko-KR')
    });

    const hasDBConflict = conflictingGoals.some((goal) => {
      const goalTime = new Date(goal.target_time).getTime();
      const timeDiff = Math.abs(testTime - goalTime);
      const isConflict = timeDiff < thirtyMinutes;

      // 충돌 발견 시에만 로그 출력 (성능 최적화)
      if (isConflict) {
        console.log("🔍 DB 목표 충돌 발견:", {
          목표시간: new Date(goal.target_time).toLocaleTimeString("ko-KR"),
          테스트시간: testDate.toLocaleTimeString("ko-KR"),
          시간차: Math.round(timeDiff / (60 * 1000)) + "분"
        });
      }

      return isConflict;
    });

    // 2. conflictingTimes 배열과의 충돌 검사 (임시 목표들)
    const hasConflictingTimesConflict = (conflictingTimes || []).some((conflictTime) => {
      const conflictTimeMs = conflictTime.getTime();
      const timeDiff = Math.abs(testTime - conflictTimeMs);
      const isConflict = timeDiff < thirtyMinutes;

      // 충돌 발견 시에만 로그 출력 (성능 최적화)
      if (isConflict) {
        console.log("🔍 임시 목표 충돌 발견:", {
          임시목표시간: conflictTime.toLocaleTimeString("ko-KR"),
          테스트시간: testDate.toLocaleTimeString("ko-KR"),
          시간차: Math.round(timeDiff / (60 * 1000)) + "분"
        });
      }

      return isConflict;
    });

    return !hasDBConflict && !hasConflictingTimesConflict;
  };

  // 시간 선택 핸들러
  const handleHourSelect = (selectedHour: number) => {
    setHour(selectedHour);
    updateTime(selectedHour, minute, isPM);
  };

  const handleMinuteSelect = (selectedMinute: number) => {
    setMinute(selectedMinute);
    updateTime(hour, selectedMinute, isPM);
  };

  const handleAmPmToggle = (newIsPM: boolean) => {
    setIsPM(newIsPM);
    updateTime(hour, minute, newIsPM);
  };

  // 현재 선택된 시간의 유효성
  const currentTimeValid = isTimeValid(hour, minute, isPM);

  // 유효성 변화 시 부모 컴포넌트에 알림
  React.useEffect(() => {
    if (onValidityChange) {
      onValidityChange(currentTimeValid);
    }
  }, [currentTimeValid, onValidityChange]);

  // 현재 시간 업데이트 (1초마다)
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* 현재 시간 표시 */}
      <View style={styles.currentTimeContainer}>
        <Text style={styles.currentTimeText}>
          현재 시간 :{" "}
          {currentTime
            .toLocaleTimeString("ko-KR", {
              hour12: true,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
            .replace("AM", "오전")
            .replace("PM", "오후")}
        </Text>
      </View>

      <View style={styles.timeDisplay}>
        {/* 시간 선택 안내 메시지 */}
        {!currentTimeValid && (
          <Text style={styles.timeSelectionGuide}>
            오전/오후, 시, 분을 모두 선택해주세요
          </Text>
        )}

        <View
          style={[
            styles.pickerContainer,
            {
              borderColor: currentTimeValid ? "#34c759" : "#ff3b30",
              borderWidth: 3,
              borderStyle: currentTimeValid ? "solid" : "dashed",
            },
          ]}
        >
          {/* AM/PM 선택 */}
          <View style={styles.ampmSection}>
            <TouchableOpacity
              style={[styles.ampmButton, isPM === false && styles.ampmActive]}
              onPress={() => handleAmPmToggle(false)}
            >
              <Text
                style={[
                  styles.ampmText,
                  isPM === false && styles.ampmActiveText,
                ]}
              >
                오전
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ampmButton, isPM === true && styles.ampmActive]}
              onPress={() => handleAmPmToggle(true)}
            >
              <Text
                style={[
                  styles.ampmText,
                  isPM === true && styles.ampmActiveText,
                ]}
              >
                오후
              </Text>
            </TouchableOpacity>
          </View>

          {/* 시간 분 선택 */}
          <View style={styles.timeRow}>
            {/* 시간 선택 */}
            <View style={styles.timeColumn}>
              <Text style={styles.columnLabel}>시간</Text>
              <ScrollView
                style={styles.timeScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {hours.map((h) => {
                  const isSelected = hour !== null && h === hour;

                  return (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.timeItem,
                        isSelected && styles.timeItemSelected,
                      ]}
                      onPress={() => handleHourSelect(h)}
                    >
                      <Text
                        style={[
                          styles.timeItemText,
                          isSelected && styles.timeItemTextSelected,
                        ]}
                      >
                        {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 분 선택 */}
            <View style={styles.timeColumn}>
              <Text style={styles.columnLabel}>분</Text>
              <ScrollView
                style={styles.timeScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {minutes.map((m) => {
                  const isSelected = minute !== null && m === minute;

                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.timeItem,
                        isSelected && styles.timeItemSelected,
                      ]}
                      onPress={() => handleMinuteSelect(m)}
                    >
                      <Text
                        style={[
                          styles.timeItemText,
                          isSelected && styles.timeItemTextSelected,
                        ]}
                      >
                        {m.toString().padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  currentTimeContainer: {
    position: "absolute",
    top: 15,
    right: 15,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 1,
  },
  currentTimeText: {
    fontSize: 11,
    color: "#333333",
    fontWeight: "600",
    fontFamily: "monospace",
  },
  timeDisplay: {
    alignItems: "center",
    width: "100%",
    maxWidth: 650,
    marginTop: 50,
  },
  timeSelectionGuide: {
    fontSize: 13,
    color: "#ff3b30",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "500",
    marginTop: 5,
  },
  pickerContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    width: "100%",
  },
  ampmSection: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
    gap: 8,
  },
  ampmButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#d0d0d0",
  },
  ampmActive: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  ampmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666666",
    textAlign: "center",
  },
  ampmActiveText: {
    color: "#ffffff",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    width: "100%",
    paddingHorizontal: 20,
  },
  timeColumn: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 15,
  },
  columnLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  timeScrollView: {
    height: 240,
    width: "100%",
    minWidth: 120,
  },
  scrollContent: {
    paddingVertical: 10,
  },
  timeItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  timeItemSelected: {
    backgroundColor: "#007AFF",
  },
  timeItemText: {
    fontSize: 18,
    fontWeight: "400",
    color: "#333",
  },
  timeItemTextSelected: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
