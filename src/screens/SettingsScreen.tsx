import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  Animated,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../supabaseClient";
import { useAuthStore } from "../store/authStore";
import useUserStore from "../store/userStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useGoalStore from "../store/goalStore";
import useRetrospectStore from "../store/retrospectStore";
import useCommunityStore from "../store/communityStore";
import { useFlexibleGoalStore } from "../store/flexibleGoalStore";
import { SUPPORTED_TIMEZONES, getCurrentTimeZone, setCurrentTimeZone } from "../utils/timeUtils";

interface SettingsScreenProps {
  navigation: any;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { isAutoLoginEnabled, enableAutoLogin, disableAutoLogin } =
    useAuthStore();
  const { signOut } = useUserStore();

  // 데이터 스토어들
  const { clearAllGoals } = useGoalStore();
  const { clearAllRetrospects } = useRetrospectStore();
  const { clearAllResolutions } = useCommunityStore();
  const { clearAllFlexibleGoals } = useFlexibleGoalStore();
  const [profile, setProfile] = useState<any>(null);
  const [isGuestUser, setIsGuestUser] = useState(false);
  const [notifications, setNotifications] = useState({
    goalAlarms: true,
    retrospectReminders: true,
    enhancedAlerts: true, // 스마트 알림을 기본으로 활성화
    soundEnabled: true,
    vibrationEnabled: true,
  });
  const [currentTimeZone, setCurrentTimeZoneState] = useState('Asia/Seoul');
  const [showTimeZonePicker, setShowTimeZonePicker] = useState(false);
  const [showSoundModeModal, setShowSoundModeModal] = useState(false);

  useEffect(() => {
    loadProfile();
    loadNotificationSettings();
    loadTimeZoneSettings();
  }, []);

  // 프로필 업데이트 후 새로고침
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      console.log('🔍 SettingsScreen - 사용자 정보:', {
        user: user ? {
          id: user.id,
          is_anonymous: user.is_anonymous,
          email: user.email
        } : null
      });
      
      if (user && !user.is_anonymous) {
        // 정식 사용자 (Supabase 계정)
        console.log('✅ 정식 사용자 감지 - DB에서 프로필 로드');
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
        setIsGuestUser(false);
      } else {
        // 게스트 사용자 (익명 사용자)
        console.log('🎭 게스트 사용자 감지 - 로컬 프로필 로드');
        const guestProfile = await AsyncStorage.getItem("guestProfile");
        if (guestProfile) {
          setProfile(JSON.parse(guestProfile));
          setIsGuestUser(true);
        } else {
          console.log('⚠️ 게스트 프로필이 없음');
          setIsGuestUser(true); // 게스트로 처리
        }
      }
      
      console.log('🔍 SettingsScreen - 최종 상태:', {
        isGuestUser: user?.is_anonymous !== false
      });
    } catch (error) {
      console.error("프로필 로드 실패:", error);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const settingsString = await AsyncStorage.getItem("notificationSettings");
      if (settingsString) {
        const settings = JSON.parse(settingsString);
        setNotifications(settings);
      }
    } catch (error) {
      console.error("알림 설정 로드 실패:", error);
    }
  };

  const saveNotificationSettings = async (newSettings: any) => {
    try {
      await AsyncStorage.setItem(
        "notificationSettings",
        JSON.stringify(newSettings),
      );
      setNotifications(newSettings);
      console.log("✅ 알림 설정 저장됨:", newSettings);
    } catch (error) {
      console.error("알림 설정 저장 실패:", error);
    }
  };

  // 사운드 모드 설명 텍스트
  const getSoundModeDescription = () => {
    if (notifications.soundEnabled && notifications.vibrationEnabled) {
      return "소리 + 진동";
    } else if (notifications.soundEnabled && !notifications.vibrationEnabled) {
      return "소리만";
    } else if (!notifications.soundEnabled && notifications.vibrationEnabled) {
      return "진동만";
    } else {
      return "무음";
    }
  };

  // 사운드 모드 아이콘
  const getSoundModeIcon = () => {
    if (notifications.soundEnabled && notifications.vibrationEnabled) {
      return "notifications";
    } else if (notifications.soundEnabled && !notifications.vibrationEnabled) {
      return "volume-high";
    } else if (!notifications.soundEnabled && notifications.vibrationEnabled) {
      return "phone-portrait";
    } else {
      return "volume-mute";
    }
  };

  // 사운드 모드 변경
  const changeSoundMode = (mode: string) => {
    let newSettings = { ...notifications };
    
    switch (mode) {
      case 'sound_vibration':
        newSettings.soundEnabled = true;
        newSettings.vibrationEnabled = true;
        break;
      case 'sound_only':
        newSettings.soundEnabled = true;
        newSettings.vibrationEnabled = false;
        break;
      case 'vibration_only':
        newSettings.soundEnabled = false;
        newSettings.vibrationEnabled = true;
        break;
      case 'silent':
        newSettings.soundEnabled = false;
        newSettings.vibrationEnabled = false;
        break;
    }
    
    saveNotificationSettings(newSettings);
    setShowSoundModeModal(false);
  };

  // 시간대 설정 로드
  const loadTimeZoneSettings = async () => {
    try {
      const timeZone = await getCurrentTimeZone();
      setCurrentTimeZoneState(timeZone);
    } catch (error) {
      console.error("시간대 설정 로드 실패:", error);
    }
  };

  // 시간대 변경
  const handleTimeZoneChange = async (timeZone: string) => {
    try {
      await setCurrentTimeZone(timeZone);
      setCurrentTimeZoneState(timeZone);
      setShowTimeZonePicker(false);
      Alert.alert("설정 완료", `시간대가 ${SUPPORTED_TIMEZONES[timeZone as keyof typeof SUPPORTED_TIMEZONES].name}로 변경되었습니다.`);
    } catch (error) {
      console.error("시간대 설정 실패:", error);
      Alert.alert("오류", "시간대 설정 중 오류가 발생했습니다.");
    }
  };

  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말로 로그아웃하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: async () => {
          try {
            await disableAutoLogin();
            await signOut();
            // signOut 함수가 session을 null로 설정하므로 
            // App.tsx의 조건부 렌더링에 의해 자동으로 AuthStack이 표시됩니다
          } catch (error) {
            console.error("로그아웃 오류:", error);
            Alert.alert("오류", "로그아웃 중 오류가 발생했습니다.");
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = async () => {
    navigation.navigate('AccountDeletionSurvey');
  };

  // 전체 데이터 초기화
  const handleFullDataReset = async () => {
    Alert.alert(
      "⚠️ 전체 데이터 초기화",
      "지금까지 작성하신 모든 목표, 회고, 다짐 등의 데이터가 완전히 삭제됩니다.\n\n이 작업은 되돌릴 수 없습니다.\n정말로 진행하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "확인",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "최종 확인",
              "마지막 한 번 더 확인하겠습니다.\n\n 모든 활동 기록을 초기화하시겠습니까?",
              [
                { text: "취소", style: "cancel" },
                {
                  text: "삭제",
                  style: "destructive",
                  onPress: performFullDataReset,
                },
              ],
            );
          },
        },
      ],
    );
  };

  const performFullDataReset = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // 데이터베이스에서 사용자 데이터 삭제
        await Promise.all([
          supabase.from("goals").delete().eq("user_id", user.id),
          supabase.from("retrospects").delete().eq("user_id", user.id),
          supabase.from("daily_resolutions").delete().eq("user_id", user.id),
          supabase.from("flexible_goals").delete().eq("user_id", user.id),
        ]);
      } else {
        // 게스트 모드의 경우 AsyncStorage 삭제
        const keysToRemove = [
          "guestGoals",
          "guestRetrospects",
          "guestDailyResolutions",
          "guestFlexibleGoals",
          "streakBadgeCategory",
        ];
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // 로컬 스토어 초기화
      clearAllGoals?.();
      clearAllRetrospects?.();
      await clearAllResolutions?.();
      clearAllFlexibleGoals?.();

      Alert.alert(
        "완료",
        "모든 데이터가 초기화되었습니다.\n새로운 시작을 응원합니다!",
      );
    } catch (error) {
      console.error("데이터 초기화 실패:", error);
      Alert.alert("오류", "데이터 초기화 중 오류가 발생했습니다.");
    }
  };

  // 선택적 데이터 삭제
  const handleSelectiveDataDelete = () => {
    Alert.alert("데이터 관리", "어떤 데이터를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { text: "목표 데이터만", onPress: () => deleteGoalsOnly() },
      { text: "회고 데이터만", onPress: () => deleteRetrospectsOnly() },
      { text: "최근 30일 데이터", onPress: () => deleteRecentData() },
    ]);
  };

  const deleteGoalsOnly = async () => {
    Alert.alert("목표 데이터 삭제", "모든 목표 데이터를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await Promise.all([
                supabase.from("goals").delete().eq("user_id", user.id),
                supabase.from("flexible_goals").delete().eq("user_id", user.id),
              ]);
            }
            clearAllGoals?.();
            clearAllFlexibleGoals?.();
            Alert.alert("완료", "목표 데이터가 삭제되었습니다.");
          } catch (error) {
            Alert.alert("오류", "삭제 중 오류가 발생했습니다.");
          }
        },
      },
    ]);
  };

  const deleteRetrospectsOnly = async () => {
    Alert.alert("회고 데이터 삭제", "모든 회고 데이터를 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from("retrospects")
                .delete()
                .eq("user_id", user.id);
            }
            clearAllRetrospects?.();
            Alert.alert("완료", "회고 데이터가 삭제되었습니다.");
          } catch (error) {
            Alert.alert("오류", "삭제 중 오류가 발생했습니다.");
          }
        },
      },
    ]);
  };

  const deleteRecentData = async () => {
    Alert.alert(
      "최근 30일 데이터 삭제",
      "최근 30일간의 모든 활동 데이터를 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              const cutoffDate = thirtyDaysAgo.toISOString();

              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (user) {
                await Promise.all([
                  supabase
                    .from("goals")
                    .delete()
                    .eq("user_id", user.id)
                    .gte("created_at", cutoffDate),
                  supabase
                    .from("retrospects")
                    .delete()
                    .eq("user_id", user.id)
                    .gte("created_at", cutoffDate),
                  supabase
                    .from("daily_resolutions")
                    .delete()
                    .eq("user_id", user.id)
                    .gte("created_at", cutoffDate),
                  supabase
                    .from("flexible_goals")
                    .delete()
                    .eq("user_id", user.id)
                    .gte("created_at", cutoffDate),
                ]);
              }

              Alert.alert("완료", "최근 30일 데이터가 삭제되었습니다.");
            } catch (error) {
              Alert.alert("오류", "삭제 중 오류가 발생했습니다.");
            }
          },
        },
      ],
    );
  };

  const showTermsOfService = () => {
    navigation.navigate("WebView", {
      url: "https://www.notion.so/2418f860031d80789588dac58ad3d624",
      title: "이용약관",
    });
  };

  const showPrivacyPolicy = () => {
    navigation.navigate("WebView", {
      url: "https://www.notion.so/2418f860031d8006b232f13ed101cc77",
      title: "개인정보 처리방침",
    });
  };

  // 커스텀 스위치 컴포넌트
  const CustomSwitch = ({
    value,
    onValueChange,
  }: {
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => {
    const [animatedValue] = useState(new Animated.Value(value ? 1 : 0));

    React.useEffect(() => {
      Animated.timing(animatedValue, {
        toValue: value ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, [value, animatedValue]);

    const interpolateBackgroundColor = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: ["#d1d1d6", "#34c759"],
    });

    const interpolateTranslateX = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 22],
    });

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onValueChange(!value)}
        style={styles.switchContainer}
      >
        <Animated.View
          style={[
            styles.switchTrack,
            { backgroundColor: interpolateBackgroundColor },
          ]}
        >
          <Animated.View
            style={[
              styles.switchThumb,
              { transform: [{ translateX: interpolateTranslateX }] },
            ]}
          />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const SettingItem = ({
    title,
    subtitle,
    icon,
    onPress,
    rightComponent,
    showArrow = true,
  }: {
    title: string;
    subtitle?: string;
    icon: string;
    onPress?: () => void;
    rightComponent?: React.ReactNode;
    showArrow?: boolean;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color="#666" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightComponent}
        {showArrow && onPress && (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>설정</Text>
        </View>

        {/* 계정 정보 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>계정</Text>
          <SettingItem
            title={profile?.display_name || "사용자"}
            subtitle={profile?.dream || "꿈을 설정해보세요"}
            icon="person"
            onPress={() => navigation.navigate("ProfileEdit")}
          />
        </View>

        {/* 시간대 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>시간대</Text>
          <SettingItem
            title="현재 시간대"
            subtitle={SUPPORTED_TIMEZONES[currentTimeZone as keyof typeof SUPPORTED_TIMEZONES]?.name || currentTimeZone}
            icon="time"
            onPress={() => setShowTimeZonePicker(true)}
          />
        </View>

        {/* 알림 설정 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          
          {/* 통합 알림 설정 */}
          <SettingItem
            title="목표 및 회고 알림"
            subtitle="목표 시간과 회고 작성 알림 활성화"
            icon="notifications"
            showArrow={false}
            rightComponent={
              <CustomSwitch
                value={notifications.goalAlarms && notifications.retrospectReminders}
                onValueChange={(value) =>
                  saveNotificationSettings({
                    ...notifications,
                    goalAlarms: value,
                    retrospectReminders: value,
                    enhancedAlerts: value, // 스마트 알림을 기본으로 활성화
                  })
                }
              />
            }
          />
          
          {/* 알림 사운드 모드 선택 */}
          {(notifications.goalAlarms || notifications.retrospectReminders) && (
            <SettingItem
              title="알림 사운드 모드"
              subtitle={getSoundModeDescription()}
              icon={getSoundModeIcon()}
              onPress={() => setShowSoundModeModal(true)}
            />
          )}
          
          <View style={styles.subsectionDivider} />
          {__DEV__ && (
            <SettingItem
              title="알림 테스트"
              subtitle="알림 시스템 작동 확인 (개발자 전용)"
              icon="flask"
              onPress={async () => {
                try {
                  const { unifiedNotificationManager } = await import('../utils/unifiedNotificationManager');
                  const testTime = new Date(Date.now() + 5000); // 5초 후
                  await unifiedNotificationManager.scheduleGoalNotification(
                    'test-notification',
                    '테스트 알림',
                    testTime
                  );
                  alert('5초 후 테스트 알림이 발송됩니다.');
                } catch (error) {
                  alert('알림 테스트 실패: ' + String(error));
                }
              }}
            />
          )}
        </View>

        {/* 데이터 관리 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>데이터</Text>
          <SettingItem
            title="선택적 데이터 삭제"
            subtitle="목표, 회고, 최근 30일 데이터 선택 삭제"
            icon="trash-outline"
            onPress={handleSelectiveDataDelete}
          />
          <SettingItem
            title="전체 데이터 초기화"
            subtitle="모든 활동 기록을 완전히 삭제"
            icon="nuclear-outline"
            onPress={handleFullDataReset}
          />
        </View>

        {/* 정보 및 지원 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>정보 및 지원</Text>
          <SettingItem
            title="앱 버전"
            subtitle="v1.0.0"
            icon="information-circle"
            showArrow={false}
          />
          <SettingItem
            title="이용약관"
            icon="document-text"
            onPress={() => showTermsOfService()}
          />
          <SettingItem
            title="개인정보 보호정책"
            icon="shield-checkmark"
            onPress={() => showPrivacyPolicy()}
          />
        </View>

        {/* 계정 관리 - 게스트가 아닌 경우에만 표시 */}
        {!isGuestUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>계정 관리</Text>
            <SettingItem
              title="로그아웃"
              icon="log-out"
              onPress={handleLogout}
            />
            <SettingItem
              title="계정 삭제"
              icon="trash"
              onPress={handleDeleteAccount}
            />
          </View>
        )}

        {/* 게스트 전용 섹션 */}
        {isGuestUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>게스트 모드</Text>
            <SettingItem
              title="정식 회원가입"
              subtitle="데이터를 유지하면서 회원가입하기"
              icon="person-add"
              onPress={() => {
                Alert.alert(
                  "정식 회원가입",
                  "게스트 데이터를 유지하면서 정식 회원으로 전환하시겠습니까?",
                  [
                    { text: "취소", style: "cancel" },
                    {
                      text: "회원가입",
                      onPress: async () => {
                        try {
                          await signOut();
                        } catch (error) {
                          console.error("로그아웃 오류:", error);
                        }
                      },
                    },
                  ],
                );
              }}
            />

          </View>
        )}

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/app-logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.footerSubtext}>행복할 우리의 그날을 위해</Text>
        </View>
      </ScrollView>

      {/* 시간대 선택 모달 */}
      <Modal
        visible={showTimeZonePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimeZonePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>시간대 선택</Text>
              <TouchableOpacity
                onPress={() => setShowTimeZonePicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.timeZoneList}>
              {Object.entries(SUPPORTED_TIMEZONES).map(([timeZone, info]) => (
                <TouchableOpacity
                  key={timeZone}
                  style={[
                    styles.timeZoneItem,
                    currentTimeZone === timeZone && styles.selectedTimeZone,
                  ]}
                  onPress={() => handleTimeZoneChange(timeZone)}
                >
                  <View>
                    <Text style={[
                      styles.timeZoneName,
                      currentTimeZone === timeZone && styles.selectedText,
                    ]}>
                      {info.name}
                    </Text>
                    <Text style={[
                      styles.timeZoneOffset,
                      currentTimeZone === timeZone && styles.selectedText,
                    ]}>
                      UTC {info.offset}
                    </Text>
                  </View>
                  {currentTimeZone === timeZone && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 사운드 모드 선택 모달 */}
      <Modal
        visible={showSoundModeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSoundModeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>알림 사운드 모드</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSoundModeModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.soundModeList}>
              <TouchableOpacity
                style={[
                  styles.soundModeItem,
                  notifications.soundEnabled && notifications.vibrationEnabled && styles.selectedSoundMode,
                ]}
                onPress={() => changeSoundMode('sound_vibration')}
              >
                <Ionicons name="notifications" size={24} color="#7B68EE" />
                <View style={styles.soundModeText}>
                  <Text style={styles.soundModeTitle}>소리 + 진동</Text>
                  <Text style={styles.soundModeDescription}>알림음과 진동을 모두 사용</Text>
                </View>
                {notifications.soundEnabled && notifications.vibrationEnabled && (
                  <Ionicons name="checkmark" size={20} color="#7B68EE" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.soundModeItem,
                  notifications.soundEnabled && !notifications.vibrationEnabled && styles.selectedSoundMode,
                ]}
                onPress={() => changeSoundMode('sound_only')}
              >
                <Ionicons name="volume-high" size={24} color="#4ECDC4" />
                <View style={styles.soundModeText}>
                  <Text style={styles.soundModeTitle}>소리만</Text>
                  <Text style={styles.soundModeDescription}>알림음만 사용, 진동 없음</Text>
                </View>
                {notifications.soundEnabled && !notifications.vibrationEnabled && (
                  <Ionicons name="checkmark" size={20} color="#7B68EE" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.soundModeItem,
                  !notifications.soundEnabled && notifications.vibrationEnabled && styles.selectedSoundMode,
                ]}
                onPress={() => changeSoundMode('vibration_only')}
              >
                <Ionicons name="phone-portrait" size={24} color="#FF9500" />
                <View style={styles.soundModeText}>
                  <Text style={styles.soundModeTitle}>진동만</Text>
                  <Text style={styles.soundModeDescription}>진동만 사용, 소리 없음</Text>
                </View>
                {!notifications.soundEnabled && notifications.vibrationEnabled && (
                  <Ionicons name="checkmark" size={20} color="#7B68EE" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.soundModeItem,
                  !notifications.soundEnabled && !notifications.vibrationEnabled && styles.selectedSoundMode,
                ]}
                onPress={() => changeSoundMode('silent')}
              >
                <Ionicons name="volume-mute" size={24} color="#999" />
                <View style={styles.soundModeText}>
                  <Text style={styles.soundModeTitle}>무음</Text>
                  <Text style={styles.soundModeDescription}>소리와 진동을 모두 비활성화</Text>
                </View>
                {!notifications.soundEnabled && !notifications.vibrationEnabled && (
                  <Ionicons name="checkmark" size={20} color="#7B68EE" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: "#fff",
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 5,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  footer: {
    alignItems: "center",
    padding: 5,
    marginBottom: 10,
  },
  footerLogo: {
    width: 120,
    height: 60,
    marginBottom: 8,
  },
  footerSubtext: {
    fontSize: 14,
    color: "#666",
    marginTop: 0,
  },
  switchContainer: {
    width: 44,
    height: 26,
    justifyContent: "center",
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  timeZoneList: {
    maxHeight: 400,
  },
  timeZoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedTimeZone: {
    backgroundColor: '#f0f8ff',
  },
  timeZoneName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  timeZoneOffset: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  selectedText: {
    color: '#007AFF',
  },
  subsectionDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
    marginHorizontal: 16,
  },
  // 사운드 모드 모달 스타일
  soundModeList: {
    paddingVertical: 10,
  },
  soundModeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedSoundMode: {
    backgroundColor: '#f0f8ff',
  },
  soundModeText: {
    flex: 1,
    marginLeft: 16,
  },
  soundModeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  soundModeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});
