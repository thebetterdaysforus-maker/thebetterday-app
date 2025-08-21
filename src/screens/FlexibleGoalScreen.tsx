import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFlexibleGoalStore } from "../store/flexibleGoalStore";
import { getTodayString } from "../utils/dateHelpers";
import { getTodayKorea, getTomorrowKorea } from "../utils/timeUtils";

interface FlexibleGoalScreenProps {
  navigation: any;
  route: any;
}

const FlexibleGoalScreen: React.FC<FlexibleGoalScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();
  const {
    fetchGoals,
    addGoal,
    deleteGoal,
    checkGoal,
    hasTodayGoal,
    getGoalsByDate,
  } = useFlexibleGoalStore();

  const [newGoalText, setNewGoalText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // 필수 목표를 내일 날짜로 설정 (내일 필수 목표)
  const getTargetDateString = () => {
    return getTomorrowKorea();
  };

  useEffect(() => {
    fetchGoals(getTargetDateString());
  }, []);

  const handleAddGoal = async () => {
    const title = newGoalText.trim();
    if (!title) {
      Alert.alert("알림", "목표 내용을 입력해주세요.");
      return;
    }

    const targetDateString = getTargetDateString();

    console.log("🔍 필수 목표 중복 검사:", {
      targetDate: targetDateString,
      hasGoal: hasTodayGoal(targetDateString),
      현재필수목표들: getGoalsByDate(targetDateString),
    });

    if (hasTodayGoal(targetDateString)) {
      Alert.alert("알림", "이미 해당 날짜의 필수 목표를 작성했습니다.");
      return;
    }

    try {
      await addGoal(title, targetDateString);
      setNewGoalText("");
      Alert.alert("목표 추가 완료", "필수 목표가 추가되었습니다.");
    } catch (error) {
      console.error("필수 목표 추가 오류:", error);
      Alert.alert(
        "추가 실패",
        (error as Error).message || "목표 추가에 실패했습니다.",
      );
    }
  };

  const handleCheckGoal = async (id: string) => {
    try {
      await checkGoal(id);
    } catch (error) {
      Alert.alert("체크 실패", "목표 체크에 실패했습니다.");
    }
  };

  const handleDeleteGoal = (id: string, title: string) => {
    Alert.alert("목표 삭제", `"${title}" 목표를 삭제하시겠습니까?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteGoal(id);
            Alert.alert("삭제 완료", "목표가 삭제되었습니다.");
          } catch (error) {
            Alert.alert("삭제 실패", "목표 삭제에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGoals(getTargetDateString());
    setRefreshing(false);
  };

  const renderTodayGoal = () => {
    const currentGoals = getGoalsByDate(getTargetDateString());
    const hasGoal = currentGoals.length > 0;

    return (
      <View style={styles.goalSection}>
        <View style={styles.goalHeader}>
          <Text style={styles.goalTypeIcon}>🎯</Text>
          <Text style={styles.goalTypeTitle}>자유 목표</Text>
          <Text style={styles.goalCount}>{hasGoal ? `1/1` : "0/1"}</Text>
        </View>

        {currentGoals.map((goal) => (
          <View key={goal.id} style={styles.goalItem}>
            <TouchableOpacity
              style={styles.goalCheckButton}
              onPress={() => handleCheckGoal(goal.id)}
            >
              <Text style={styles.goalCheckIcon}>
                {goal.status === "success" ? "✅" : "⭕"}
              </Text>
            </TouchableOpacity>

            <View style={styles.goalContent}>
              <Text
                style={[
                  styles.goalTitle,
                  goal.status === "success" && styles.goalCompleted,
                ]}
              >
                {goal.title}
              </Text>
              <Text style={styles.goalStatus}>
                {goal.status === "success"
                  ? "완료"
                  : goal.status === "failure"
                    ? "실패"
                    : "진행 중"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.goalDeleteButton}
              onPress={() => handleDeleteGoal(goal.id, goal.title)}
            >
              <Text style={styles.goalDeleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))}

        {!hasGoal && (
          <View style={styles.goalInput}>
            <TextInput
              style={styles.input}
              placeholder="오늘 꼭 해야하는 것은 무엇인가요?!"
              placeholderTextColor="#999"
              value={newGoalText}
              onChangeText={setNewGoalText}
              maxLength={100}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddGoal}>
              <Text style={styles.addButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={{ paddingTop: Math.max(insets.top, 44) }} />
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
        <Text style={styles.headerSubtitle}>
          시간에 얽매이지 않고 오늘 달성하고 싶은 목표를 적어주세요!
        </Text>
        <Text style={styles.noticeText}>
          📌 자유 목표는 당일 기준으로만 적용됩니다!
        </Text>
      </View>

      {/* 목표 섹션 */}
      {renderTodayGoal()}

      {/* 도움말 */}
      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>💡 사용 팁</Text>
        <Text style={styles.helpText}>
          • 하루에 하나의 자유 목표만 설정 가능합니다{"\n"}• 당일에만 설정할 수
          있습니다{"\n"}• 예시: 독서 50페이지 이상 읽기{"\n"}• DB에는
          포함되지 않습니다
        </Text>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },

  headerSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 10,
    marginTop : 20,
  },
  noticeText: {
    fontSize: 12,
    color: "#8e44ad",
    backgroundColor: "#f3e5f5",
    padding: 8,
    borderRadius: 6,
    textAlign: "center",
  },

  goalSection: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  goalTypeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  goalTypeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  goalCount: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  goalItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  goalCheckButton: {
    marginRight: 12,
  },
  goalCheckIcon: {
    fontSize: 20,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    color: "#333",
    marginBottom: 2,
  },
  goalCompleted: {
    textDecorationLine: "line-through",
    color: "#666",
  },
  goalStatus: {
    fontSize: 12,
    color: "#666",
  },
  goalDeleteButton: {
    marginLeft: 8,
  },
  goalDeleteIcon: {
    fontSize: 16,
  },
  goalInput: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 15,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 30,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  addButton: {
    backgroundColor: "#2196F3",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  helpSection: {
    backgroundColor: "#fff",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});

export default FlexibleGoalScreen;
