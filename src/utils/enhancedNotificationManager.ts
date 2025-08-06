// 🔔 강화된 알림 관리자 - Development Build 전용
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getKoreaTime, getTodayKorea } from './timeUtils';

/**
 * Development Build 전용 강화된 알림 시스템
 * - 스마트 알림 스케줄링
 * - 사용자 패턴 기반 최적화
 * - 백그라운드 알림 지원
 */
export class EnhancedNotificationManager {
  private static instance: EnhancedNotificationManager;
  private isInitialized = false;
  private isDevelopmentBuild = false;

  static getInstance(): EnhancedNotificationManager {
    if (!EnhancedNotificationManager.instance) {
      EnhancedNotificationManager.instance = new EnhancedNotificationManager();
    }
    return EnhancedNotificationManager.instance;
  }

  /**
   * 초기화 - Development Build 감지
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('🌐 웹 환경에서는 강화된 알림 시스템 비활성화');
      return false;
    }

    try {
      // Development Build 환경 감지
      const expoConstants = require('expo-constants').default;
      this.isDevelopmentBuild = expoConstants?.appOwnership === 'standalone' || 
                               expoConstants?.executionEnvironment === 'standalone';

      if (!this.isDevelopmentBuild) {
        console.log('📱 Expo Go 환경 - 기본 알림 시스템 사용');
        return false;
      }

      // 알림 핸들러 설정 (Development Build 전용)
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const goalId = notification.request.content.data?.goalId;
          const notificationType = notification.request.content.data?.type;
          
          console.log(`🔔 알림 수신: ${notificationType} for goal ${goalId}`);
          
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
      });

      // 알림 응답 처리
      Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse);

      this.isInitialized = true;
      console.log('✅ 강화된 알림 관리자 초기화 완료 (Development Build)');
      return true;
    } catch (error) {
      console.error('❌ 강화된 알림 관리자 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 알림 응답 처리
   */
  private handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const goalId = response.notification.request.content.data?.goalId;
    const actionType = response.actionIdentifier;
    
    console.log(`👆 알림 응답: ${actionType} for goal ${goalId}`);
    
    // 알림 클릭 시 해당 목표로 이동하는 로직 추가 가능
    if (actionType === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // 기본 알림 클릭 - 앱 열기
      console.log('📱 앱으로 이동');
    }
  };

  /**
   * 스마트 목표 알림 스케줄링
   * - 목표 10분 전: 준비 알림
   * - 목표 정시: 실행 알림
   * - 목표 3분 후: 마지막 기회 알림
   */
  async scheduleSmartGoalNotifications(goal: any): Promise<string[]> {
    if (!this.isDevelopmentBuild) {
      console.log('📱 Expo Go에서는 스마트 알림 건너뜀');
      return [];
    }

    const notificationIds: string[] = [];
    const targetTime = new Date(goal.target_time);
    const now = getKoreaTime();

    try {
      // 1. 준비 알림 (10분 전)
      const prepareTime = new Date(targetTime.getTime() - 10 * 60 * 1000);
      if (prepareTime > now) {
        const prepareId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎯 목표 준비 시간!',
            body: `곧 "${goal.title}" 목표 시간입니다. 준비하세요!`,
            data: { goalId: goal.id, type: 'prepare' },
          },
          trigger: { type: 'date', date: prepareTime } as any,
        });
        notificationIds.push(prepareId);
        console.log(`⏰ 준비 알림 예약: ${prepareTime.toLocaleString('ko-KR')}`);
      }

      // 2. 실행 알림 (정시)
      if (targetTime > now) {
        const executeId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚀 목표 실행 시간!',
            body: `"${goal.title}" 지금이 목표 시간입니다!`,
            data: { goalId: goal.id, type: 'execute' },
          },
          trigger: { type: 'date', date: targetTime } as any,
        });
        notificationIds.push(executeId);
        console.log(`🎯 실행 알림 예약: ${targetTime.toLocaleString('ko-KR')}`);
      }

      // 3. 마지막 기회 알림 (3분 후)
      const lastChanceTime = new Date(targetTime.getTime() + 3 * 60 * 1000);
      if (lastChanceTime > now) {
        const lastChanceId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚡ 마지막 기회!',
            body: `"${goal.title}" 아직 체크할 수 있습니다!`,
            data: { goalId: goal.id, type: 'lastChance' },
          },
          trigger: { type: 'date', date: lastChanceTime } as any,
        });
        notificationIds.push(lastChanceId);
        console.log(`⚡ 마지막 기회 알림 예약: ${lastChanceTime.toLocaleString('ko-KR')}`);
      }

      // 알림 ID를 AsyncStorage에 저장
      await AsyncStorage.setItem(
        `goal_notifications_${goal.id}`, 
        JSON.stringify(notificationIds)
      );

      return notificationIds;
    } catch (error) {
      console.error('❌ 스마트 알림 스케줄링 실패:', error);
      return [];
    }
  }

  /**
   * 목표별 알림 취소
   */
  async cancelGoalNotifications(goalId: string): Promise<void> {
    if (!this.isDevelopmentBuild) return;

    try {
      const storedIds = await AsyncStorage.getItem(`goal_notifications_${goalId}`);
      if (storedIds) {
        const notificationIds: string[] = JSON.parse(storedIds);
        
        for (const notificationId of notificationIds) {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        }
        
        await AsyncStorage.removeItem(`goal_notifications_${goalId}`);
        console.log(`🗑️ 목표 ${goalId} 알림 취소 완료: ${notificationIds.length}개`);
      }
    } catch (error) {
      console.error('❌ 목표 알림 취소 실패:', error);
    }
  }

  /**
   * 회고 알림 스케줄링 (22시)
   */
  async scheduleRetrospectNotification(): Promise<string | null> {
    if (!this.isDevelopmentBuild) return null;

    try {
      const today = getTodayKorea();
      const retrospectTime = new Date(`${today}T22:00:00+09:00`);
      const now = getKoreaTime();

      if (retrospectTime > now) {
        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📝 오늘의 회고 시간',
            body: '오늘 하루는 어떠셨나요? 회고를 작성해보세요.',
            data: { type: 'retrospect' },
          },
          trigger: { type: 'date', date: retrospectTime } as any,
        });

        console.log(`📝 회고 알림 예약: ${retrospectTime.toLocaleString('ko-KR')}`);
        return notificationId;
      }
      
      return null;
    } catch (error) {
      console.error('❌ 회고 알림 스케줄링 실패:', error);
      return null;
    }
  }

  /**
   * 알림 통계 수집
   */
  async trackNotificationEngagement(notificationId: string, action: 'opened' | 'dismissed'): Promise<void> {
    try {
      const statsKey = 'notification_stats';
      const existingStats = await AsyncStorage.getItem(statsKey);
      const stats = existingStats ? JSON.parse(existingStats) : { opened: 0, dismissed: 0 };
      
      stats[action]++;
      
      await AsyncStorage.setItem(statsKey, JSON.stringify(stats));
      console.log(`📊 알림 통계 업데이트: ${action}`);
    } catch (error) {
      console.error('❌ 알림 통계 추적 실패:', error);
    }
  }

  /**
   * Development Build 환경 확인
   */
  isDevelopmentBuildEnvironment(): boolean {
    return this.isDevelopmentBuild;
  }
}

// 전역 인스턴스 생성
export const enhancedNotificationManager = EnhancedNotificationManager.getInstance();