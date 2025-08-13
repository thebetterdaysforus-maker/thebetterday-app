// 🔔 통합 알림 관리자 - 이중 시스템 최적화
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getKoreaTime, getTodayKorea } from './timeUtils';
import { NotificationManager } from './notificationManager';
import { EnhancedNotificationManager } from './enhancedNotificationManager';
// 기본 사운드 설정
const DEFAULT_SOUND_CONFIG = {
  sound: 'default', // 시스템 기본 알림음
  shouldPlaySound: true,
  shouldSetBadge: true,
  shouldShowAlert: true,
  shouldShowBanner: true,
  shouldShowList: true,
};

/**
 * 통합 알림 관리자
 * - 환경 감지 후 적절한 알림 시스템 선택
 * - 기존 시스템과의 충돌 방지
 * - 설정 기반 스마트 관리
 */
export class UnifiedNotificationManager {
  private static instance: UnifiedNotificationManager;
  private basicManager: NotificationManager;
  private enhancedManager: EnhancedNotificationManager;
  private isEnhancedMode = false;
  private isInitialized = false;

  static getInstance(): UnifiedNotificationManager {
    if (!UnifiedNotificationManager.instance) {
      UnifiedNotificationManager.instance = new UnifiedNotificationManager();
    }
    return UnifiedNotificationManager.instance;
  }

  constructor() {
    this.basicManager = NotificationManager.getInstance();
    this.enhancedManager = EnhancedNotificationManager.getInstance();
  }

  /**
   * 초기화 - 환경 감지 및 최적 시스템 선택
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    if (Platform.OS === 'web') {
      console.log('🌐 웹 환경 - 알림 시스템 비활성화');
      return false;
    }

    // 기본 알림 구성 설정 (사운드 포함)
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const settings = await this.getNotificationSettings();
        return {
          shouldShowAlert: true,
          shouldShowBanner: true, 
          shouldShowList: true,
          shouldPlaySound: settings?.soundEnabled !== false,
          shouldSetBadge: true,
        };
      },
    });

    try {
      // Enhanced 시스템 먼저 시도 (Development Build)
      const enhancedReady = await this.enhancedManager.initialize();
      
      if (enhancedReady) {
        this.isEnhancedMode = true;
        console.log('✅ 강화된 알림 시스템 활성화 (Development Build)');
      } else {
        // 기본 시스템으로 폴백
        const basicReady = await this.basicManager.initialize();
        if (basicReady) {
          this.isEnhancedMode = false;
          console.log('✅ 기본 알림 시스템 활성화 (Expo Go)');
        } else {
          console.log('❌ 알림 시스템 초기화 실패');
          return false;
        }
      }

      // 권한 요청
      await this.requestPermission();
      
      // 기존 중복 알림 정리
      await this.cleanupDuplicateNotifications();
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ 통합 알림 관리자 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 알림 설정 조회
   */
  private async getNotificationSettings(): Promise<{ soundEnabled?: boolean } | null> {
    try {
      const settingsString = await AsyncStorage.getItem('notificationSettings');
      return settingsString ? JSON.parse(settingsString) : { soundEnabled: true };
    } catch (error) {
      console.error('❌ 알림 설정 조회 실패:', error);
      return null;
    }
  }

  /**
   * 권한 요청
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      console.log(`🔐 알림 권한 상태: ${finalStatus}`);
      return finalStatus === 'granted';
    } catch (error) {
      console.error('❌ 알림 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 스마트 목표 알림 스케줄링
   */
  async scheduleGoalNotification(goalId: string, title: string, targetTime: Date, userNickname?: string): Promise<boolean> {
    if (!await this.initialize()) return false;

    try {
      // 기존 알림 정리
      await this.cancelGoalNotification(goalId);

      if (this.isEnhancedMode) {
        // Development Build - 3단계 알림
        const goal = { id: goalId, title, target_time: targetTime.toISOString() };
        const notificationIds = await this.enhancedManager.scheduleSmartGoalNotifications(goal as any);
        
        // 알림 ID 저장
        await AsyncStorage.setItem(`goal_notifications_${goalId}`, JSON.stringify(notificationIds));
        console.log(`🔔 강화된 3단계 알림 예약: ${title}`);
        return notificationIds.length > 0;
      } else {
        // Expo Go - 기본 알림
        const success = await this.basicManager.scheduleGoalNotification(goalId, title, targetTime);
        console.log(`📱 기본 알림 예약: ${title}`);
        return success;
      }
    } catch (error) {
      console.error('❌ 목표 알림 스케줄링 실패:', error);
      return false;
    }
  }

  /**
   * 회고 알림 스케줄링
   */
  async scheduleRetrospectNotification(targetTime: Date): Promise<boolean> {
    if (!await this.initialize()) return false;

    try {
      if (this.isEnhancedMode) {
        const notificationId = await this.enhancedManager.scheduleRetrospectNotification(targetTime);
        return !!notificationId;
      } else {
        return await this.basicManager.scheduleRetrospectNotification(targetTime);
      }
    } catch (error) {
      console.error('❌ 회고 알림 스케줄링 실패:', error);
      return false;
    }
  }

  /**
   * 목표 알림 취소
   */
  async cancelGoalNotification(goalId: string): Promise<void> {
    try {
      if (this.isEnhancedMode) {
        // Enhanced 시스템의 다중 알림 취소
        const storedIds = await AsyncStorage.getItem(`goal_notifications_${goalId}`);
        if (storedIds) {
          const notificationIds = JSON.parse(storedIds);
          for (const id of notificationIds) {
            await Notifications.cancelScheduledNotificationAsync(id);
          }
          await AsyncStorage.removeItem(`goal_notifications_${goalId}`);
          console.log(`🔕 강화된 알림 취소: ${goalId} (${notificationIds.length}개)`);
        }
      } else {
        // 기본 시스템의 단일 알림 취소
        await this.basicManager.cancelNotification(goalId);
        console.log(`🔕 기본 알림 취소: ${goalId}`);
      }
    } catch (error) {
      console.error(`❌ 목표 알림 취소 실패: ${goalId}`, error);
    }
  }

  /**
   * 모든 알림 취소
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // AsyncStorage의 알림 ID들도 정리
      const keys = await AsyncStorage.getAllKeys();
      const notificationKeys = keys.filter(key => key.startsWith('goal_notifications_'));
      if (notificationKeys.length > 0) {
        await AsyncStorage.multiRemove(notificationKeys);
      }
      
      console.log('🧹 모든 알림 취소 및 저장소 정리 완료');
    } catch (error) {
      console.error('❌ 전체 알림 취소 실패:', error);
    }
  }

  /**
   * 예약된 알림 목록 확인
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('❌ 예약 알림 조회 실패:', error);
      return [];
    }
  }

  /**
   * 중복 알림 정리
   */
  private async cleanupDuplicateNotifications(): Promise<void> {
    try {
      const scheduled = await this.getScheduledNotifications();
      console.log(`🔍 현재 예약된 알림 ${scheduled.length}개 발견`);
      
      // 같은 목표에 대한 중복 알림 찾기
      const goalNotifications = new Map<string, string[]>();
      
      for (const notification of scheduled) {
        const goalId = notification.content.data?.goalId;
        if (goalId && typeof goalId === 'string') {
          if (!goalNotifications.has(goalId)) {
            goalNotifications.set(goalId, []);
          }
          goalNotifications.get(goalId)!.push(notification.identifier);
        }
      }

      // 중복 정리 로그
      let duplicatesFound = 0;
      goalNotifications.forEach((ids, goalId) => {
        if (ids.length > 3) { // Enhanced 모드는 3개까지 정상
          duplicatesFound += ids.length - 3;
          console.log(`⚠️ 목표 ${goalId}에 대한 과도한 알림 ${ids.length}개 발견`);
        }
      });

      if (duplicatesFound > 0) {
        console.log(`🧹 ${duplicatesFound}개 중복 알림 정리 예정`);
      }

    } catch (error) {
      console.error('❌ 중복 알림 정리 실패:', error);
    }
  }

  /**
   * 알림 시스템 상태 확인
   */
  getSystemStatus(): {
    isInitialized: boolean;
    isEnhancedMode: boolean;
    platform: string;
  } {
    return {
      isInitialized: this.isInitialized,
      isEnhancedMode: this.isEnhancedMode,
      platform: Platform.OS
    };
  }

  /**
   * 스마트 알림 메시지 생성
   */
  private async getSmartNotificationMessage(goalTitle: string, userDisplayName?: string): Promise<string> {
    try {
      // 새로운 메시지 시스템 사용
      const { getRandomMessage, replaceVariables } = await import('../data/notificationMessages');
      
      const randomMsg = getRandomMessage('goal');
      return replaceVariables(randomMsg.message, { 
        goal: goalTitle, 
        display_name: userDisplayName || '사용자'
      });
    } catch (error) {
      console.error('❌ 스마트 메시지 생성 실패:', error);
      return `『${goalTitle}』 목표 달성 시간입니다! 🎯`;
    }
  }

  /**
   * 전체 알림 목록 조회 (디버그용)
   */
  async getAllScheduledNotifications(): Promise<void> {
    try {
      const notifications = await this.getScheduledNotifications();
      console.log(`📋 현재 예약된 알림 ${notifications.length}개:`);
      notifications.forEach((notif, index) => {
        const trigger = notif.trigger;
        const triggerInfo = 'type' in trigger && 'date' in trigger 
          ? `${new Date(trigger.date).toLocaleString('ko-KR')}`
          : '알림 시간 정보 없음';
        console.log(`  ${index + 1}. ${notif.content.title} - ${triggerInfo}`);
      });
    } catch (error) {
      console.error('❌ 알림 목록 조회 실패:', error);
    }
  }

  /**
   * 특정 알림 취소 (통합)
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`🔕 알림 취소: ${notificationId}`);
    } catch (error) {
      console.error(`❌ 알림 취소 실패: ${notificationId}`, error);
    }
  }
}

// 전역 인스턴스 생성
export const unifiedNotificationManager = UnifiedNotificationManager.getInstance();