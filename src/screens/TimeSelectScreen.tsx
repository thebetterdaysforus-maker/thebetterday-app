// src/screens/TimeSelectScreen.tsx
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import useGoalStore from "../store/goalStore";
import CustomTimePicker from "../components/CustomTimePicker";

/* ────── 날짜 헬퍼 ────── */
const nearestFutureHalfHour = (): Date => {
  // 🔥 한국 시간 기준으로 3시간 후 계산
  const koreaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  koreaTime.setHours(koreaTime.getHours() + 3);
  const m = koreaTime.getMinutes();
  const rounded = m < 30 ? 30 : 60;
  if (rounded === 60) koreaTime.setHours(koreaTime.getHours() + 1);
  koreaTime.setMinutes(rounded % 60, 0, 0);
  
  console.log("📅 nearestFutureHalfHour 계산:", {
    현재한국시간: new Date().toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}),
    계산결과: koreaTime.toLocaleString('ko-KR')
  });
  
  return koreaTime;
};
const tomorrowStart = (): Date => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 30, 0, 0); // 오전 12:30부터 시작 (12:00 방지)
  return d;
};
const tomorrowEnd = (): Date => {
  const d = tomorrowStart();
  d.setHours(23, 30, 0, 0);
  return d;
};

export default function TimeSelectScreen({ navigation, route }: any) {
  /* 오늘 vs 내일 모드 - 기본값은 "today"로 당일 추가 모드 */
  const isTomorrow = route.params?.initial === "tomorrow";
  const isToday = route.params?.initial === "today";

  /* 시간 재설정 모드 체크 */
  const isTimeReset = route.params?.currentTime;
  const goalId = route.params?.goalId;

  /* 기본값 - 시간 재설정 시 현재 시간 + 1분 사용 */
  const base = isTimeReset
    ? (() => {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1); // 현재 시간 + 1분
        now.setSeconds(0, 0); // 초와 밀리초 제거
        return now;
      })()
    : isTomorrow
      ? tomorrowStart()
      : nearestFutureHalfHour();
  const [targetTime, setTargetTime] = useState<Date>(base);
  const [isTimeValid, setIsTimeValid] = useState<boolean>(true);

  /* 목표 스토어 - 중복 체크용 */
  const { goals, fetchGoals } = useGoalStore();

  // 화면 로드 시 한 번만 목표 데이터 조회 
  React.useEffect(() => {
    console.log('🔄 TimeSelectScreen에서 수행 목록 데이터 강제 조회');
    fetchGoals().catch(console.error);
  }, []); // fetchGoals 의존성 제거로 무한 루프 방지

  /* 피커 변경 → 자유로운 분 단위 선택 */
  const onChange = (_: DateTimePickerEvent, date?: Date) => {
    if (!date) return;

    // 내일 모드일 때는 날짜를 내일로 고정
    if (isTomorrow) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      date.setFullYear(tomorrow.getFullYear());
      date.setMonth(tomorrow.getMonth());
      date.setDate(tomorrow.getDate());
    }

    // 초와 밀리초는 0으로 설정
    date.setSeconds(0, 0);
    setTargetTime(date);
  };

  /* GoalDetail 이동 전 중복 체크 및 시간 제한 체크 */
  const goNext = () => {
    // 시간 유효성 체크 - CustomTimePicker에서 검증된 상태 확인
    if (!isTimeValid) {
      console.log('⚠️ 유효하지 않은 시간으로 저장 시도 차단');
      return; // 저장 시도 자체를 차단
    }
    const selectedTimeISO = targetTime.toISOString();
    const now = new Date();

    // 00:00:00 시간 자동 수정 (Date value out of bounds 방지)
    if (targetTime.getHours() === 0 && targetTime.getMinutes() === 0) {
      const correctedTime = new Date(targetTime);
      correctedTime.setMinutes(30); // 00:30으로 자동 수정
      setTargetTime(correctedTime);
      console.log('🔧 00:00:00 시간을 00:30:00으로 자동 수정');
      return;
    }

    // 시간 제한 체크 - 내일 모드와 시간 재설정 모드에서는 제약 없음
    // 내일 목표와 편집 모드에서는 모든 시간 제약 건너뜀
    console.log("🕐 TimeSelectScreen 시간 제약 검사:", {
      isTomorrow,
      isTimeReset,
      현재시간: now.toLocaleString('ko-KR'),
      수행시간: targetTime.toLocaleString('ko-KR'),
      제약건너뜀: isTomorrow || isTimeReset
    });
    
    if (!isTomorrow && !isTimeReset) {
      // 🔥 새 목표 모드 3시간 제한 활성화 (당일만)
      const minAllowedTime = new Date(now.getTime() + 3 * 60 * 60 * 1000);
      if (targetTime <= minAllowedTime) {
        console.log("❌ 당일 수행 목록 작성 3시간 제한 위반 - 알림 표시");
        Alert.alert(
          '수행 목록 설정 시간 제한', 
          '새 수행 목록은 현재 시간으로부터 최소 3시간 이후에 설정할 수 있습니다.\n\n' +
          `현재 시간: ${now.toLocaleTimeString('ko-KR', { hour12: true, hour: '2-digit', minute: '2-digit' }).replace('AM', '오전').replace('PM', '오후')}\n` +
          `설정 가능한 시간: ${minAllowedTime.toLocaleTimeString('ko-KR', { hour12: true, hour: '2-digit', minute: '2-digit' }).replace('AM', '오전').replace('PM', '오후')} 이후`
        );
        return;
      }
    } else {
      console.log("✅ 내일 모드 또는 시간 재설정 모드 - 모든 시간 제약 완전 건너뜀");
    }

    // ±30분 범위 충돌 체크 - 시간 재설정 모드에서는 본인 목표 제외
    const selectedTime = targetTime.getTime();
    
    console.log("🔍 TimeSelectScreen 충돌 검사:", {
      selectedTime: targetTime.toLocaleTimeString('ko-KR'),
      selectedTimeISO: targetTime.toISOString(),
      isTimeReset,
      goalId,
      existingGoalsCount: (goals || []).length,
      existingGoals: (goals || []).map(g => ({
        id: g.id,
        time: new Date(g.target_time).toLocaleTimeString('ko-KR'),
        timeISO: g.target_time
      }))
    });
    
    // 같은 날짜의 목표들만 필터링 (정확한 날짜 비교)
    const selectedDateLocal = targetTime.toLocaleDateString();
    const sameDayGoals = (goals || []).filter(g => {
      const goalDate = new Date(g.target_time);
      const goalDateLocal = goalDate.toLocaleDateString();
      const isSameDate = goalDateLocal === selectedDateLocal;
      
      console.log("📅 개별 수행 목록 날짜 비교:", {
        수행: g.title,
        수행시간: g.target_time,
        수행날짜로컬: goalDateLocal,
        선택날짜로컬: selectedDateLocal,
        같은날짜: isSameDate
      });
      
      return isSameDate;
    });

    console.log("📅 TimeSelectScreen 최종 같은 날짜 필터링:", {
      selectedDate: selectedDateLocal,
      selectedTime: targetTime.toLocaleString(),
      totalGoals: (goals || []).length,
      sameDayGoals: sameDayGoals.length,
      sameDayGoalsList: sameDayGoals.map(g => ({
        title: g.title,
        time: new Date(g.target_time).toLocaleTimeString('ko-KR')
      }))
    });

    // 🔥 정확한 30분 충돌 체크 - 실제 충돌만 감지
    const conflictingGoals = sameDayGoals.filter((g) => {
      // 편집 모드에서는 현재 편집 중인 목표 제외
      if (isTimeReset && g.id === goalId) return false;

      const goalTime = new Date(g.target_time).getTime();
      const timeDiff = Math.abs(targetTime.getTime() - goalTime);
      const thirtyMinutes = 30 * 60 * 1000; // 30분을 밀리초로 변환
      const isConflict = timeDiff < thirtyMinutes;

      console.log("⏰ 정확한 충돌 체크:", {
        기존목록: g.title,
        기존시간: new Date(g.target_time).toLocaleTimeString('ko-KR'),
        선택시간: targetTime.toLocaleTimeString('ko-KR'),
        시간차분: Math.round(timeDiff / (60 * 1000)) + "분",
        충돌여부: isConflict
      });

      return isConflict;
    });

    // 실제 충돌이 있을 때만 알림 표시하고 저장 차단
    if (conflictingGoals.length > 0) {
      const conflictInfo = conflictingGoals.map(g => 
        `- ${g.title} (${new Date(g.target_time).toLocaleTimeString('ko-KR', { 
          hour12: true, hour: '2-digit', minute: '2-digit' 
        }).replace('AM', '오전').replace('PM', '오후')})`
      ).join('\n');
      
      console.log("🚫 실제 30분 충돌 감지 - 저장 차단:", conflictingGoals.length + "개");
      
      Alert.alert(
        '시간 중복',
        `선택한 시간과 30분 이내로 가까운 목록이 존재합니다.:\n\n${conflictInfo}\n\n다른 시간을 선택해주세요.`
      );
      return; // 여기서 저장 차단
    }

    console.log("✅ 30분 충돌 없음 - 저장 진행");

    // 시간 재설정 모드인 경우 이전 화면으로 돌아가면서 변경된 시간 전달
    if (isTimeReset) {
      console.log('🔄 시간 재설정 모드 - 변경된 시간으로 돌아가기:', selectedTimeISO);
      navigation.navigate("GoalDetail", {
        goalId: goalId,
        prefilledTime: selectedTimeISO,
        updatedTime: selectedTimeISO, // 변경된 시간 전달
        batch: route.params?.batch ?? false,
      });
    } else {
      // 수행 목록 추가 모드
      navigation.navigate("GoalDetail", {
        goalId: null,
        prefilledTime: selectedTimeISO,
        batch: route.params?.batch ?? false,
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 수행 목록</Text>
        </TouchableOpacity>
        <Text style={styles.title}>시간 선택</Text>
      </View>

      {/* 시간 선택 컨테이너 */}
      <View style={styles.timePickerContainer}>
        <CustomTimePicker
          value={targetTime}
          onChange={(date) => setTargetTime(date)}
          onValidityChange={setIsTimeValid}
          isTomorrowMode={isTomorrow}
          goals={goals || []}
          conflictingTimes={[]} // TimeSelectScreen에서는 DB 목표만 체크
          excludeGoalId={isTimeReset ? goalId : undefined}
        />
      </View>

      {/* 다음 버튼 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.nextButton,
            !isTimeValid && styles.nextButtonDisabled
          ]}
          onPress={goNext}
          disabled={!isTimeValid}
        >
          <Text style={[
            styles.nextButtonText,
            !isTimeValid && styles.nextButtonTextDisabled
          ]}>
            다음
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ────── 스타일 ────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 44, // SafeArea 고려
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#ffffff",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
  },
  timePickerContainer: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 60,
    backgroundColor: "#f8f9fa",
  },
  nextButton: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    minWidth: 120,
  },
  nextButtonDisabled: {
    backgroundColor: "#cccccc",
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
  nextButtonTextDisabled: {
    color: "#999999",
  },
});
