import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useCommunityStore, {
  DailyResolution,
  FilterType,
} from "../store/communityStore";
import { formatDate } from "../utils/dateHelpers";
import { supabase } from "../supabaseClient";

const CommunityScreen = () => {
  const {
    resolutions,
    myResolution,
    loading,
    currentFilter,
    fetchMyResolution,
    saveMyResolution,
    deleteMyResolution,
    toggleMyResolutionPublic,
    fetchResolutions,
    toggleLike,
    setFilter,
    refreshResolutions,
  } = useCommunityStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      // 구글 인증이 완료되었는지 확인
      const isGoogleAuth = session?.user?.app_metadata?.provider === 'google';
      const isRealUser = isGoogleAuth && session?.user?.email;
      
      console.log('🔍 커뮤니티 인증 상태 확인:', {
        hasSession: !!session,
        provider: session?.user?.app_metadata?.provider || 'none',
        hasEmail: !!session?.user?.email,
        isGoogleAuth,
        isRealUser,
        isAnonymous: !isRealUser,
        userId: session?.user?.id || 'null'
      });
      
      setIsAnonymous(!isRealUser);
    };

    checkSession();
    fetchMyResolution();
    fetchResolutions();
  }, []);

  const handleFilterChange = (filter: FilterType) => {
    setFilter(filter);
    fetchResolutions(filter);
  };

  const handleToggleLike = async (resolutionId: string) => {
    try {
      await toggleLike(resolutionId);
    } catch (error: any) {
      Alert.alert(
        "좋아요 실패",
        error.message || "좋아요 처리에 실패했습니다.",
      );
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchMyResolution(), refreshResolutions()]);
    setRefreshing(false);
  };

  const handleTogglePublic = async () => {
    try {
      await toggleMyResolutionPublic();
    } catch (error: any) {
      Alert.alert(
        "공개 설정 변경 실패",
        error.message || "공개 설정 변경에 실패했습니다.",
      );
    }
  };

  const renderResolutionItem = React.useCallback(
    ({ item }: { item: DailyResolution }) => (
      <View style={styles.resolutionCard}>
        <View style={styles.resolutionHeader}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.display_name}
          </Text>
        </View>
        <Text
          style={[
            styles.resolutionContent,
            {
              fontSize:
                item.content.length > 50
                  ? 12
                  : item.content.length > 30
                    ? 14
                    : 16,
            },
          ]}
          numberOfLines={3}
          adjustsFontSizeToFit={true}
        >
          {item.content}
        </Text>
        <View style={styles.resolutionFooter}>
          <TouchableOpacity
            style={styles.likeButton}
            onPress={() => handleToggleLike(item.id)}
          >
            <Ionicons
              name={item.is_liked_by_current_user ? "heart" : "heart-outline"}
              size={18}
              color={item.is_liked_by_current_user ? "#ff6b6b" : "#666"}
            />
            <Text style={styles.likeCount}>{item.like_count}</Text>
          </TouchableOpacity>
          <Text style={styles.date}>{formatDate(item.date)}</Text>
        </View>
      </View>
    ),
    [handleToggleLike],
  );

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={{ paddingTop: Math.max(insets.top, 44) }} />
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>별들의 외침</Text>
      </View>

      {/* 내 각오 피드백 섹션 */}
      <View style={styles.myResolutionSection}>
        {!myResolution ? (
          <View style={styles.noResolutionCard}>
            <Ionicons name="chatbubble-outline" size={24} color="#999" />
            <Text style={styles.noResolutionText}>
              등록 다짐/응원의 말 문이 없어 네트워킹에 공유되지 않았습니다.
            </Text>
            <Text style={styles.noResolutionSubText}>
              네트워킹에는 전날 다짐/응원의 말만 표시됩니다!
            </Text>
          </View>
        ) : (
          <View style={styles.myResolutionCompactCard}>
            <View style={styles.compactHeader}>
              <Text style={styles.compactLabel}>내 다짐/응원</Text>
              <Text style={styles.compactSeparator}>:</Text>
              <Text style={styles.compactContent} numberOfLines={1}>
                {myResolution.content}
              </Text>
            </View>
            <View style={styles.compactStats}>
              <TouchableOpacity
                style={styles.publicToggleButton}
                onPress={handleTogglePublic}
              >
                <Ionicons
                  name={myResolution.is_public ? "eye" : "eye-off"}
                  size={14}
                  color={myResolution.is_public ? "#007AFF" : "#999"}
                />
              </TouchableOpacity>
              <Ionicons name="heart" size={14} color="#ff6b6b" />
              <Text style={styles.compactLikeCount}>
                {myResolution.like_count || 0}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* 필터 섹션 */}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            currentFilter === "recent" && styles.activeFilter,
          ]}
          onPress={() => handleFilterChange("recent")}
        >
          <Text
            style={[
              styles.filterText,
              currentFilter === "recent" && styles.activeFilterText,
            ]}
          >
            최신순
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            currentFilter === "popular" && styles.activeFilter,
          ]}
          onPress={() => handleFilterChange("popular")}
        >
          <Text
            style={[
              styles.filterText,
              currentFilter === "popular" && styles.activeFilterText,
            ]}
          >
            인기순
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            currentFilter === "random" && styles.activeFilter,
          ]}
          onPress={() => handleFilterChange("random")}
        >
          <Text
            style={[
              styles.filterText,
              currentFilter === "random" && styles.activeFilterText,
            ]}
          >
            랜덤
          </Text>
        </TouchableOpacity>
      </View>

      {/* 각오 목록 */}
      <FlatList
        data={resolutions}
        renderItem={renderResolutionItem}
        keyExtractor={(item) => item.id}
        style={styles.resolutionList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#007AFF"]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isAnonymous ? (
            <View style={styles.emptyState}>
              <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>게스트 모드에서는 다짐/응원의 말 공유가 제한됩니다</Text>
              <Text style={styles.emptySubText}>
                회원가입하고 커뮤니티에 참여해보세요!
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>아직 등록된 다짐/응원이 없어요</Text>
              <Text style={styles.emptySubText}>
                첫 번째 다짐/응원을 작성해보세요!
              </Text>
            </View>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  myResolutionSection: {
    backgroundColor: "#fff",
    marginTop: 10,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  writeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    borderStyle: "dashed",
  },
  writeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  myResolutionCard: {
    backgroundColor: "#e8f4ff",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#b8daff",
    minHeight: 100,
    maxHeight: 100,
  },
  myResolutionCompactCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e9ecef",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 50,
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  compactLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  compactSeparator: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  compactContent: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  compactStats: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  compactLikeCount: {
    marginLeft: 4,
    fontSize: 12,
    color: "#666",
  },
  publicToggleButton: {
    padding: 4,
    marginRight: 8,
  },
  myResolutionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  myResolutionLabel: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
  },
  myResolutionActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  myResolutionContent: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    flex: 1,
    textAlignVertical: "center",
  },
  writeSection: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
  },
  textInput: {
    fontSize: 16,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: 8,
  },
  writeActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  filterSection: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e9ecef",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
  },
  activeFilter: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "500",
  },
  resolutionList: {
    flex: 1,
  },
  resolutionCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 8,
    paddingRight: 15,
    paddingLeft: 15,
    paddingBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 8,
  },
  resolutionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  displayName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  resolutionContent: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginBottom: 12,
  },
  resolutionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 5,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  likeCount: {
    marginLeft: 4,
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  // 새로운 읽기 전용 스타일
  noResolutionCard: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  noResolutionText: {
    fontSize: 10,
    color: "#666",
    marginTop: 8,
    fontWeight: "500",
  },
  noResolutionSubText: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
  },
  guestModeCard: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff5f5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fee2e2",
  },
  guestModeText: {
    fontSize: 10,
    color: "#dc2626",
    marginTop: 8,
    fontWeight: "500",
    textAlign: "center",
  },
  guestModeSubText: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: 4,
    textAlign: "center",
  },
  socialStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});

export default CommunityScreen;
