// src/screens/tutorial/TutorialCalendarScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 튜토리얼용 캘린더 목 데이터
const MOCK_CALENDAR_DATA: Record<string, { hasGoals: boolean; completionRate: number }> = {
  '2025-07-28': { hasGoals: true, completionRate: 80 },
  '2025-07-29': { hasGoals: true, completionRate: 60 },
  '2025-07-30': { hasGoals: true, completionRate: 100 },
  '2025-07-31': { hasGoals: true, completionRate: 40 },
  '2025-08-01': { hasGoals: true, completionRate: 60 },
  '2025-08-02': { hasGoals: false, completionRate: 0 },
};

interface TutorialCalendarScreenProps {
  onOverlayToggle?: () => void;
  tutorialMode?: boolean;
}

export default function TutorialCalendarScreen({ 
  onOverlayToggle,
  tutorialMode = false 
}: TutorialCalendarScreenProps) {
  const [selectedDate, setSelectedDate] = useState('2025-08-01');

  // 달력 렌더링을 위한 날짜 생성
  const renderCalendarDays = () => {
    const days = [];
    const startDate = new Date(2025, 6, 27); // 7월 27일부터
    
    for (let i = 0; i < 35; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dateString = currentDate.toISOString().split('T')[0];
      const dayData = MOCK_CALENDAR_DATA[dateString];
      const isCurrentMonth = currentDate.getMonth() === 7; // 8월
      const isSelected = dateString === selectedDate;
      
      days.push(
        <TouchableOpacity
          key={dateString}
          style={[
            styles.calendarDay,
            !isCurrentMonth && styles.otherMonthDay,
            isSelected && styles.selectedDay,
            dayData?.hasGoals && styles.hasGoalsDay,
          ]}
          onPress={() => setSelectedDate(dateString)}
        >
          <Text style={[
            styles.dayText,
            !isCurrentMonth && styles.otherMonthText,
            isSelected && styles.selectedDayText,
          ]}>
            {currentDate.getDate()}
          </Text>
          {dayData?.hasGoals && (
            <View style={[
              styles.completionIndicator,
              { backgroundColor: getCompletionColor(dayData.completionRate) }
            ]} />
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };

  const getCompletionColor = (rate: number) => {
    if (rate >= 80) return '#10B981'; // 초록
    if (rate >= 60) return '#F59E0B'; // 주황
    return '#EF4444'; // 빨강
  };

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

      <ScrollView style={styles.content}>
        {/* 월 헤더 */}
        <View style={styles.monthHeader}>
          <TouchableOpacity style={styles.monthNavButton}>
            <Ionicons name="chevron-back" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>2025년 8월</Text>
          <TouchableOpacity style={styles.monthNavButton}>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View style={styles.weekHeader}>
          {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
            <Text key={index} style={styles.weekDay}>{day}</Text>
          ))}
        </View>

        {/* 달력 그리드 */}
        <View style={styles.calendarGrid}>
          {renderCalendarDays()}
        </View>

        {/* 선택된 날짜 정보 */}
        <View style={styles.selectedDateInfo}>
          <Text style={styles.selectedDateTitle}>
            {new Date(selectedDate).toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </Text>
          
          {MOCK_CALENDAR_DATA[selectedDate] ? (
            <View style={styles.dayStats}>
              <Text style={styles.completionText}>
                목표 달성률: {MOCK_CALENDAR_DATA[selectedDate].completionRate}%
              </Text>
              <TouchableOpacity style={styles.viewDetailButton}>
                <Text style={styles.viewDetailText}>상세 보기</Text>
                <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noDataText}>이 날짜에는 설정된 목표가 없습니다.</Text>
          )}
        </View>

        {/* 성장 목록 버튼 */}
        <TouchableOpacity style={styles.growthListButton}>
          <View style={styles.growthListContent}>
            <View style={styles.growthListIcon}>
              <Ionicons name="trending-up" size={24} color="#8B5CF6" />
            </View>
            <View style={styles.growthListText}>
              <Text style={styles.growthListTitle}>성장 목록</Text>
              <Text style={styles.growthListSubtitle}>전체적인 데이터 분석을 확인하세요</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* 범례 */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>완료율 표시</Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>80% 이상</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>60-79%</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendText}>60% 미만</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 하단 탭 바 */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity style={styles.tab}>
          <Ionicons name="home-outline" size={24} color="#999" />
          <Text style={styles.tabText}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Ionicons name="calendar" size={24} color="#8B5CF6" />
          <Text style={[styles.tabText, styles.activeTabText]}>캘린더</Text>
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
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  monthNavButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  weekHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#f0f0f0',
    position: 'relative',
  },
  otherMonthDay: {
    backgroundColor: '#f8f9fa',
  },
  selectedDay: {
    backgroundColor: '#8B5CF6',
  },
  hasGoalsDay: {
    backgroundColor: '#f0f9ff',
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  otherMonthText: {
    color: '#ccc',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  completionIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectedDateInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  dayStats: {
    // 통계 영역
  },
  completionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  viewDetailText: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  growthListButton: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  growthListContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  growthListIcon: {
    marginRight: 12,
  },
  growthListText: {
    flex: 1,
  },
  growthListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  growthListSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  legend: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
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