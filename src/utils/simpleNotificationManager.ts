// 🔔 단순화된 알림 관리자 - 목표당 2개 알림 시스템
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_MESSAGES, getRandomNotificationMessage } from '../data/notificationMessages';

// 비동기로 사용자 닉네임 가져오기 - Supabase profiles 테이블에서 조회
const getUserDisplayName = async (): Promise<string> => {
  try {
    // 먼저 Zustand profileStore에서 시도
    const profileStoreData = await AsyncStorage.getItem('profile-storage');
    if (profileStoreData) {
      const profileStore = JSON.parse(profileStoreData);
      if (profileStore?.state?.profile?.display_name) {
        return profileStore.state.profile.display_name;
      }
    }
    
    // Supabase auth-storage에서 세션 확인
    const authData = await AsyncStorage.getItem('sb-bfqprzjjxcimwxupzyaw-auth-token');
    if (authData) {
      const authInfo = JSON.parse(authData);
      if (authInfo?.user?.user_metadata?.display_name) {
        return authInfo.user.user_metadata.display_name;
      }
    }
    
    // 기본값
    return '사용자';
  } catch (error) {
    if (__DEV__) console.warn('⚠️ 사용자 닉네임 조회 실패:', error);
    return '사용자';
  }
};



// Expo Go 환경 감지
const isExpoGo = Constants.executionEnvironment === 'storeClient';

/**
 * 단순화된 알림 관리자
 * - 목표당 정확히 2개 알림 (준비 -5분, 실행 +3분)
 * - 중복 방지 및 환경 자동 감지
 * - 기존 notificationMessages.ts 활용
 */
export class SimpleNotificationManager {
  private static instance: SimpleNotificationManager;
  private isInitialized = false;
  private canUseNotifications = false;

  static getInstance(): SimpleNotificationManager {
    if (!SimpleNotificationManager.instance) {
      SimpleNotificationManager.instance = new SimpleNotificationManager();
    }
    return SimpleNotificationManager.instance;
  }

  /**
   * 초기화 - 환경 감지 및 기본 설정
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return this.canUseNotifications;

    if (Platform.OS === 'web') {
      if (__DEV__) console.log('🌐 웹 환경 - 알림 시스템 비활성화');
      this.canUseNotifications = false;
      this.isInitialized = true;
      return false;
    }

    if (isExpoGo) {
      if (__DEV__) console.log('📱 Expo Go 환경 - 알림 시스템 제한적 사용');
      // Expo Go에서는 알림 스케줄링 문제가 있을 수 있음
      console.warn('⚠️ Expo Go에서는 알림이 정상 작동하지 않을 수 있습니다. Development Build 권장');
    } else {
      if (__DEV__) console.log('🔧 Development Build 환경 - 전체 알림 기능 사용');
    }

    try {
      // 알림 핸들러 설정
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

      this.canUseNotifications = true;
      this.isInitialized = true;
      if (__DEV__) console.log('✅ 단순 알림 관리자 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 알림 관리자 초기화 실패:', error);
      this.canUseNotifications = false;
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * 알림 권한 요청
   */
  async requestPermission(): Promise<boolean> {
    if (!this.canUseNotifications) return false;

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      return finalStatus === 'granted';
    } catch (error) {
      console.error('❌ 알림 권한 요청 실패:', error);
      return false;
    }
  }

  /**
   * 목표 알림 스케줄링 (2단계: -5분, +3분)
   */
  async scheduleGoalNotification(
    goalId: string,
    title: string,
    targetTime: Date
  ): Promise<void> {
    if (!this.canUseNotifications) {
      if (__DEV__) console.log('🚫 알림 시스템 비활성화로 스케줄링 건너뜀');
      return;
    }

    // 🔥 한국 시간 고정 시스템으로 변경
    const { getKoreaTime } = await import('../utils/timeUtils');
    
    const nowKorea = getKoreaTime();
    // targetTime이 이미 UTC로 저장되어 있으므로 그대로 사용
    const targetKorea = new Date(targetTime);
    
    // 현재 시간과 목표 시간의 차이를 분 단위로 계산
    const timeDifferenceMinutes = (targetKorea.getTime() - nowKorea.getTime()) / (1000 * 60);
    
    if (__DEV__) console.log(`⏰ 알림 시간 검증: 목표까지 ${Math.round(timeDifferenceMinutes)}분 남음`);
    
    // 목표 시간이 이미 지났거나 10분 이내인 경우 알림 설정 안함 (알림 스팸 방지)
    if (targetKorea <= nowKorea || timeDifferenceMinutes <= 10) {
      if (__DEV__) console.log(`⏰ 목표 시간이 너무 가깝거나 지나서 알림 설정 안함 (차이: ${Math.round(timeDifferenceMinutes)}분) - 알림 스팸 방지`);
      return;
    }

    // 사용자 알림 설정 확인 - 기본값은 항상 활성화
    const settings = await this.getNotificationSettings();
    
    // 사용자가 명시적으로 OFF한 경우에만 비활성화
    if (settings?.goalAlarms === false) {
      if (__DEV__) console.log('🔕 목표 알림 비활성화됨');
      return;
    }

    // 🔔 알림 권한 요청 및 확인
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      if (__DEV__) console.log('🚫 알림 권한 거부됨 - 스케줄링 중단');
      return;
    }
    if (__DEV__) console.log('✅ 알림 권한 확인 완료');

    try {
      // 기존 목표 알림 취소 (중복 방지)
      await this.cancelGoalNotifications(goalId);

      // 🔔 정확한 -5분, +3분 알림 시스템 (한국 시간 기준)
      // 1. 준비 알림 (목표 시간 -5분) - 확인 버튼 활성화 시점
      const prepareTime = new Date(targetTime.getTime() - 5 * 60 * 1000);
      
      if (prepareTime > nowKorea) {
        const prepareMessage = await getRandomNotificationMessage(title);
        await Notifications.scheduleNotificationAsync({
          identifier: `goal_prepare_${goalId}`,
          content: {
            title: '목표 달성 시간입니다!',
            body: prepareMessage,
            sound: 'default',
            data: {
              goalId,
              type: 'prepare',
              targetTime: targetTime.toISOString(),
            },
          },
          trigger: { date: prepareTime } as any,
        });

        if (__DEV__) console.log(`🔔 준비 알림 설정: ${prepareTime.toLocaleString('ko-KR', {hour: '2-digit', minute: '2-digit'})}`);
      } else {
        if (__DEV__) console.log(`⏰ 준비 알림 시간 지남 - 설정 안함`);
      }

      // 2. 실행 알림 (목표 시간 +3분) - 실행 시점
      const executeTime = new Date(targetTime.getTime() + 3 * 60 * 1000);
      const executeMessage = await getRandomNotificationMessage(title);
      await Notifications.scheduleNotificationAsync({
        identifier: `goal_execute_${goalId}`,
        content: {
          title: '목표 달성 시간입니다!',
          body: executeMessage,
          sound: 'default',
          data: {
            goalId,
            type: 'execute',
            targetTime: targetTime.toISOString(),
          },
        },
        trigger: { date: executeTime } as any,
      });

      if (__DEV__) console.log(`🎯 실행 알림 설정: ${executeTime.toLocaleString('ko-KR', {hour: '2-digit', minute: '2-digit'})}`);
      if (__DEV__) console.log(`✅ "${title}" 알림 완료`);
      
      // Expo Go 환경에서는 알림 검증을 건너뛰고 정상 완료 처리
      if (isExpoGo) {
        if (__DEV__) console.log('📱 Expo Go 환경 - 알림 검증 건너뛰고 완료 처리');
      } else {
        // Development Build에서만 알림 검증
        setTimeout(() => this.getAllScheduledNotifications(), 2000);
      }

    } catch (error) {
      console.error('❌ 목표 알림 스케줄링 실패:', error);
    }
  }

  /**
   * 목표 알림 취소
   */
  async cancelGoalNotifications(goalId: string): Promise<void> {
    if (!this.canUseNotifications) return;

    try {
      await Notifications.cancelScheduledNotificationAsync(`goal_prepare_${goalId}`);
      await Notifications.cancelScheduledNotificationAsync(`goal_execute_${goalId}`);
      if (__DEV__) console.log(`🔕 목표 ${goalId} 알림 취소 완료`);
    } catch (error) {
      console.error('❌ 목표 알림 취소 실패:', error);
    }
  }

  /**
   * 회고 알림 스케줄링
   */
  async scheduleRetrospectNotification(targetTime: Date): Promise<void> {
    if (!this.canUseNotifications) return;

    const now = new Date();
    if (targetTime <= now) {
      if (__DEV__) console.log('⏰ 회고 시간이 이미 지나서 알림 설정 안함');
      return;
    }

    const settings = await this.getNotificationSettings();
    if (!settings?.retrospectReminders) {
      if (__DEV__) console.log('🔕 회고 알림 비활성화됨');
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync('retrospect-reminder');
      
      await Notifications.scheduleNotificationAsync({
        identifier: 'retrospect-reminder',
        content: {
          title: '오늘의 회고 시간입니다',
          body: '오늘 하루를 돌아보며 성장의 기록을 남겨보세요',
          sound: 'default',
          data: {
            type: 'retrospect',
          },
        },
        trigger: { date: targetTime } as any,
      });

      if (__DEV__) console.log(`📝 회고 알림 설정: ${targetTime.toLocaleTimeString('ko-KR')}`);
    } catch (error) {
      console.error('❌ 회고 알림 스케줄링 실패:', error);
    }
  }

  /**
   * 단일 알림 취소
   */
  async cancelNotification(identifier: string): Promise<void> {
    if (!this.canUseNotifications) return;

    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      if (__DEV__) console.log(`🔕 알림 취소: ${identifier}`);
    } catch (error) {
      console.error(`❌ 알림 취소 실패 (${identifier}):`, error);
    }
  }

  /**
   * 모든 예약된 알림 확인 (디버깅용)
   */
  async getAllScheduledNotifications(): Promise<void> {
    if (!this.canUseNotifications) {
      console.log('📭 알림 시스템 비활성화');
      return;
    }

    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log(`🔔 예약된 알림 총 ${notifications.length}개:`);
      
      if (notifications.length === 0) {
        if (isExpoGo) {
          console.log('📱 Expo Go 환경 - 알림 스케줄링은 정상이지만 로컬 알림 제한으로 인해 표시되지 않을 수 있음');
        } else {
          console.log('📭 예약된 알림이 없습니다 - 알림 스케줄링 문제 가능성 있음');
        }
        return;
      }

      notifications.forEach((notif, index) => {
        const trigger = notif.trigger as { date?: Date };
        const triggerTime = trigger?.date ? new Date(trigger.date).toLocaleString('ko-KR') : '시간 정보 없음';
        const type = notif.content.data?.type || '타입 없음';
        
        console.log(`  ${index + 1}. ${notif.identifier}`);
        console.log(`     제목: ${notif.content.title}`);
        console.log(`     시간: ${triggerTime}`);
        console.log(`     타입: ${type}`);
      });
    } catch (error) {
      console.error('❌ 예약된 알림 조회 실패:', error);
    }
  }

  /**
   * 모든 알림 취소
   */
  async cancelAllNotifications(): Promise<void> {
    if (!this.canUseNotifications) {
      console.log('📭 알림 시스템 비활성화');
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🧹 모든 예약된 알림이 취소되었습니다');
    } catch (error) {
      console.error('❌ 모든 알림 취소 실패:', error);
    }
  }

  /**
   * 알림 설정 가져오기
   */
  private async getNotificationSettings(): Promise<any> {
    try {
      const settingsString = await AsyncStorage.getItem('notificationSettings');
      const defaultSettings = {
        goalAlarms: true,  // 항상 기본값은 활성화
        retrospectReminders: true,
        soundEnabled: true,
      };
      return settingsString ? { ...defaultSettings, ...JSON.parse(settingsString) } : defaultSettings;
    } catch (error) {
      return {
        goalAlarms: true,  // 오류 시에도 활성화
        retrospectReminders: true,
        soundEnabled: true,
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const simpleNotificationManager = SimpleNotificationManager.getInstance();
