// src/screens/tutorial/TutorialNetworkingScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// 튜토리얼용 네트워킹 목 데이터
const MOCK_RESOLUTIONS = [
  {
    id: 'resolution-1',
    author: '김도현',
    content: '오늘은 새로운 운동 루틴을 시작해보겠습니다! 건강한 하루가 되길 💪',
    likes: 12,
    isLiked: false,
    timestamp: '2025-08-01T09:30:00Z',
  },
  {
    id: 'resolution-2',
    author: '이서영',
    content: '독서 시간을 늘려서 새로운 지식을 쌓아가려고 합니다. 오늘 목표는 30페이지!',
    likes: 8,
    isLiked: true,
    timestamp: '2025-08-01T08:15:00Z',
  },
  {
    id: 'resolution-3',
    author: '박민수',
    content: '요리를 배워보고 싶어서 오늘은 파스타에 도전해봅니다. 맛있게 만들어질까요? 🍝',
    likes: 15,
    isLiked: false,
    timestamp: '2025-08-01T07:45:00Z',
  },
  {
    id: 'resolution-4',
    author: '최지연',
    content: '아침 명상으로 하루를 시작하고, 마음의 평화를 찾는 시간을 가져보겠습니다 🧘‍♀️',
    likes: 6,
    isLiked: true,
    timestamp: '2025-08-01T06:30:00Z',
  },
];

interface TutorialNetworkingScreenProps {
  onOverlayToggle?: () => void;
  tutorialMode?: boolean;
}

export default function TutorialNetworkingScreen({ 
  onOverlayToggle,
  tutorialMode = false 
}: TutorialNetworkingScreenProps) {
  const [myResolution, setMyResolution] = useState("");
  const [resolutions, setResolutions] = useState(MOCK_RESOLUTIONS);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleLike = (id: string) => {
    setResolutions(prev =>
      prev.map(resolution =>
        resolution.id === id
          ? {
              ...resolution,
              isLiked: !resolution.isLiked,
              likes: resolution.isLiked ? resolution.likes - 1 : resolution.likes + 1
            }
          : resolution
      )
    );
  };

  const handleSubmitResolution = () => {
    if (!myResolution.trim()) return;
    
    // 튜토리얼에서는 실제로 추가하지 않고 시연용으로만
    setMyResolution("");
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    return `${Math.floor(diffInHours / 24)}일 전`;
  };

  const renderResolutionItem = ({ item }: any) => (
    <View style={styles.resolutionCard}>
      <View style={styles.resolutionHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.author.charAt(0)}
            </Text>
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{item.author}</Text>
            <Text style={styles.timestamp}>{formatTimeAgo(item.timestamp)}</Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.resolutionContent}>{item.content}</Text>
      
      <View style={styles.resolutionFooter}>
        <TouchableOpacity
          style={styles.likeButton}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons
            name={item.isLiked ? "heart" : "heart-outline"}
            size={20}
            color={item.isLiked ? "#EF4444" : "#666"}
          />
          <Text style={[
            styles.likeCount,
            item.isLiked && styles.likedCount
          ]}>
            {item.likes}
          </Text>
        </TouchableOpacity>
      </View>
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

      <View style={styles.content}>
        {/* 내 다짐 작성 영역 */}
        <View style={styles.myResolutionCard}>
          <Text style={styles.sectionTitle}>오늘의 다짐을 공유해보세요</Text>
          <TextInput
            style={[styles.resolutionInput, isInputFocused && styles.focusedInput]}
            placeholder="오늘 하루 어떤 목표를 가지고 계신가요?"
            placeholderTextColor="#999"
            value={myResolution}
            onChangeText={setMyResolution}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            multiline
            maxLength={200}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{myResolution.length}/200</Text>
            <TouchableOpacity
              style={[
                styles.submitButton,
                !myResolution.trim() && styles.disabledButton,
              ]}
              onPress={handleSubmitResolution}
              disabled={!myResolution.trim()}
            >
              <Text style={styles.submitButtonText}>공유하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 다른 사용자들의 다짐 목록 */}
        <View style={styles.resolutionsList}>
          <Text style={styles.sectionTitle}>커뮤니티 다짐</Text>
          <FlatList
            data={resolutions}
            keyExtractor={(item) => item.id}
            renderItem={renderResolutionItem}
            showsVerticalScrollIndicator={false}
            style={styles.flatList}
          />
        </View>
      </View>

      {/* 하단 탭 바 */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity style={styles.tab}>
          <Ionicons name="home-outline" size={24} color="#999" />
          <Text style={styles.tabText}>홈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Ionicons name="calendar-outline" size={24} color="#999" />
          <Text style={styles.tabText}>캘린더</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Ionicons name="people" size={24} color="#8B5CF6" />
          <Text style={[styles.tabText, styles.activeTabText]}>네트워크</Text>
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
  myResolutionCard: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  resolutionInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  focusedInput: {
    borderColor: '#8B5CF6',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  resolutionsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  flatList: {
    flex: 1,
  },
  resolutionCard: {
    backgroundColor: '#fff',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resolutionHeader: {
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  resolutionContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  resolutionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCount: {
    fontSize: 14,
    color: '#666',
  },
  likedCount: {
    color: '#EF4444',
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