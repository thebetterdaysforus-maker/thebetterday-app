// src/screens/tutorial/TutorialGoalListScreen.tsx
import React, { useState } from "react";
import {
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 튜토리얼용 목 데이터
const MOCK_GOALS = [
  {
    id: 'tutorial-1',
    text: '아침 운동하기',
    scheduled_time: '07:00',
    target_date: '2025-08-01',
    status: 'pending',
    canCheck: true,
    canEdit: true,
  },
  {
    id: 'tutorial-2',
    text: '업무 집중하기',
    scheduled_time: '09:30',
    target_date: '2025-08-01',
    status: 'pending',
    canCheck: true,
    canEdit: true,
  },
  {
    id: 'tutorial-3',
    text: '점심 후 산책',
    scheduled_time: '13:00',
    target_date: '2025-08-01',
    status: 'success',
    canCheck: false,
    canEdit: false,
  },
  {
    id: 'tutorial-4',
    text: '독서 시간',
    scheduled_time: '19:00',
    target_date: '2025-08-01',
    status: 'pending',
    canCheck: true,
    canEdit: true,
  },
  {
    id: 'tutorial-5',
    text: '수면 준비',
    scheduled_time: '22:30',
    target_date: '2025-08-01',
    status: 'pending',
    canCheck: true,
    canEdit: true,
  },
];

interface TutorialGoalListScreenProps {
  onOverlayToggle?: () => void;
  tutorialMode?: boolean;
}

export default function TutorialGoalListScreen({ 
  onOverlayToggle,
  tutorialMode = false 
}: TutorialGoalListScreenProps) {
  const [inputText, setInputText] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [mockGoals, setMockGoals] = useState(MOCK_GOALS);
  const [refreshing, setRefreshing] = useState(false);

  const sections = [
    {
      title: "오늘의 목표 (5개)",
      data: mockGoals.map(goal => ({
        goal,
        canCheck: goal.canCheck,
        canEdit: goal.canEdit,
      })),
    },
  ];

  const handleGoalCheck = (goalId: string) => {
    setMockGoals(prevGoals =>
      prevGoals.map(goal =>
        goal.id === goalId
          ? { ...goal, status: goal.status === 'success' ? 'pending' : 'success' }
          : goal
      )
    );
  };

  const handleAddGoal = () => {
    if (!inputText.trim()) return;
    setInputText("");
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderGoalItem = ({ item }: any) => {
    const { goal, canCheck, canEdit } = item;
    const isCompleted = goal.status === 'success';

    return (
      <TouchableOpacity
        style={[
          styles.goalItem,
          isCompleted && styles.completedGoal,
          !canCheck && styles.disabledGoal,
        ]}
        onPress={() => canCheck && handleGoalCheck(goal.id)}
        disabled={!canCheck}
      >
        <View style={styles.goalContent}>
          <View style={styles.goalInfo}>
            <View style={[
              styles.checkbox,
              isCompleted && styles.checkedBox,
              !canCheck && styles.disabledCheckbox,
            ]}>
              {isCompleted && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[
                styles.goalText,
                isCompleted && styles.completedText,
                !canCheck && styles.disabledText,
              ]}>
                {goal.text}
              </Text>
              <Text style={[
                styles.timeText,
                !canCheck && styles.disabledText,
              ]}>
                {goal.scheduled_time}
              </Text>
            </View>
          </View>
          
          {canEdit && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => {/* 튜토리얼에서는 동작하지 않음 */}}
            >
              <Ionicons name="create-outline" size={18} color="#8B5CF6" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 상단 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>The Better Day</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="notifications-outline" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="person-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 메인 콘텐츠 */}
      <View style={styles.content}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.goal.id}
          renderItem={renderGoalItem}
          renderSectionHeader={renderSectionHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#8B5CF6']}
            />
          }
          style={styles.sectionList}
          contentContainerStyle={styles.sectionListContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* 입력 영역 */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={styles.inputCard}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, isInputFocused && styles.focusedInput]}
              placeholder="오늘의 목표를 입력해주세요"
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              multiline
              maxLength={100}
            />
            <TouchableOpacity
              style={[
                styles.addButton,
                !inputText.trim() && styles.disabledButton,
              ]}
              onPress={handleAddGoal}
              disabled={!inputText.trim()}
            >
              <Text style={styles.addButtonText}>추가</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 하단 탭 바 (시각적 용도) */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Ionicons name="home" size={24} color="#8B5CF6" />
          <Text style={[styles.tabText, styles.activeTabText]}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Ionicons name="calendar-outline" size={24} color="#999" />
          <Text style={styles.tabText}>캘린더</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Ionicons name="people-outline" size={24} color="#999" />
          <Text style={styles.tabText}>네트워크</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Ionicons name="settings-outline" size={24} color="#999" />
          <Text style={styles.tabText}>설정</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  sectionList: {
    flex: 1,
  },
  sectionListContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  goalItem: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedGoal: {
    backgroundColor: '#f0f9ff',
    borderColor: '#8B5CF6',
    borderWidth: 1,
  },
  disabledGoal: {
    opacity: 0.6,
  },
  goalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkedBox: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  disabledCheckbox: {
    borderColor: '#ccc',
  },
  goalTextContainer: {
    flex: 1,
  },
  goalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#666',
  },
  disabledText: {
    color: '#999',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
  },
  editButton: {
    padding: 4,
  },
  inputContainer: {
    backgroundColor: '#f8f9fa',
  },
  inputCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  focusedInput: {
    borderColor: '#8B5CF6',
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 60,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    // 활성 탭 스타일
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  activeTabText: {
    color: '#8B5CF6',
    fontWeight: '500',
  },
});