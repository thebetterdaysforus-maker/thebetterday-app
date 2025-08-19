// 🔔 단순화된 알림 관리자 - 목표당 2개 알림 시스템
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NOTIFICATION_MESSAGES } from '../data/notificationMessages';

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

// 랜덤 알림 메시지 가져오기 함수 - 사용자 닉네임 비동기 치환
const getRandomNotificationMessage = async (type: 'general' | 'goal' = 'general'): Promise<string> => {
  const filteredMessages = NOTIFICATION_MESSAGES.filter(msg => msg.type === type);
  const randomMessage = filteredMessages[Math.floor(Math.random() * filteredMessages.length)];
  
  if (!randomMessage) return '목표를 달성해보세요!';
  
  let message = randomMessage.message;
  
  // 사용자 닉네임 치환
  if (message.includes('{display_name}')) {
    const displayName = await getUserDisplayName();
    message = message.replace(/\{display_name\}/g, displayName);
    if (__DEV__) console.log(`📝 알림 메시지 치환: "${displayName}" 적용`);
  }
  
  return message;
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
      if (__DEV__) console.log('📱 Expo Go 환경 - 로컬 알림만 사용');
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

    // 🔥 한국 시간 기준으로 정확한 시간 비교
    const nowKorea = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const targetKorea = new Date(targetTime.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    
    if (__DEV__) console.log('⏰ 알림 시간 검증:', {
      현재한국시간: nowKorea.toLocaleString('ko-KR'),
      목표한국시간: targetKorea.toLocaleString('ko-KR'),
      UTC목표시간: targetTime.toISOString(),
      지났는지: targetKorea <= nowKorea
    });
    
    if (targetKorea <= nowKorea) {
      if (__DEV__) console.log('⏰ 목표 시간이 이미 지나서 알림 설정 안함');
      return;
    }

    // 사용자 알림 설정 확인
    const settings = await this.getNotificationSettings();
    if (!settings?.goalAlarms) {
      if (__DEV__) console.log('🔕 목표 알림 비활성화됨');
      return;
    }

    // 🚫 알림 권한 요청 비활성화 - 기본 설정에서 알림 활성화됨
    // 사용자가 원할 때만 설정에서 비활성화 가능
    if (__DEV__) console.log('✅ 알림 권한 자동 승인 (팝업 방지)');

    try {
      // 기존 목표 알림 취소 (중복 방지)
      await this.cancelGoalNotifications(goalId);

      // 🔔 정확한 -5분, +3분 알림 시스템 (한국시간 기준)
      // 1. 준비 알림 (목표 시간 -5분) - 확인 버튼 활성화 시점
      const prepareTime = new Date(targetTime.getTime() - 5 * 60 * 1000);
      const prepareTimeKorea = new Date(prepareTime.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
      
      if (prepareTimeKorea > nowKorea) {
        const prepareMessage = await getRandomNotificationMessage('general');
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

        if (__DEV__) console.log(`🔔 준비 알림 설정 완료: ${prepareTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      } else {
        if (__DEV__) console.log(`⏰ 준비 알림 시간 지남 (설정 안함): ${prepareTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      }

      // 2. 실행 알림 (목표 시간 +3분) - 실행 시점
      const executeTime = new Date(targetTime.getTime() + 3 * 60 * 1000);
      const executeMessage = await getRandomNotificationMessage('general');
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

      if (__DEV__) console.log(`🎯 실행 알림 설정 완료: ${executeTime.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`);
      if (__DEV__) console.log(`✅ 목표 "${title}" 2단계 알림 스케줄링 완료`);
      
      // 디버깅용 - 설정된 알림 즉시 확인
      setTimeout(() => this.getAllScheduledNotifications(), 1000);

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
        console.log('📭 예약된 알림이 없습니다 - 알림 스케줄링 문제 가능성 있음');
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
      return settingsString ? JSON.parse(settingsString) : {
        goalAlarms: true,
        retrospectReminders: true,
        soundEnabled: true,
      };
    } catch (error) {
      return {
        goalAlarms: true,
        retrospectReminders: true,
        soundEnabled: true,
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const simpleNotificationManager = SimpleNotificationManager.getInstance();