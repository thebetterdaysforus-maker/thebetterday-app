// 📱 통합 알림 관리자 - 단일 모듈로 통합
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * 단일 통합 알림 관리자
 * 모든 알림 관련 로직을 여기서만 처리
 */
export class NotificationManager {
  private static instance: NotificationManager;
  private isInitialized = false;

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 초기화 - 네이티브 환경에서만 작동
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('🌐 웹 환경에서는 알림 시스템 비활성화');
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    try {
      // 알림 핸들러 설정
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      this.isInitialized = true;
      console.log('✅ 알림 관리자 초기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 알림 관리자 초기화 실패:', error);
      return false;
    }
  }

  /**
   * 권한 요청
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

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
   * 목표 알림 설정
   */
  async scheduleGoalNotification(goalId: string, title: string, targetTime: Date): Promise<boolean> {
    if (!await this.initialize()) return false;
    
    try {
      // 기존 알림 취소
      await this.cancelNotification(goalId);
      
      // 새 알림 설정
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '목표 달성 시간입니다! 🎯',
          body: `${title} 목표를 실행할 시간이에요!`,
          data: { goalId },
        },
        trigger: {
          type: 'date',
          date: targetTime,
        } as any,
      });
      
      console.log(`📱 목표 알림 설정: ${title} - ${targetTime.toLocaleString('ko-KR')}`);
      return true;
    } catch (error) {
      console.error('❌ 목표 알림 설정 실패:', error);
      return false;
    }
  }

  /**
   * 회고 알림 설정
   */
  async scheduleRetrospectNotification(targetTime: Date): Promise<boolean> {
    if (!await this.initialize()) return false;
    
    try {
      const identifier = 'retrospect-reminder';
      
      // 기존 회고 알림 취소
      await this.cancelNotification(identifier);
      
      // 새 회고 알림 설정
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '회고 작성 시간입니다! 📝',
          body: '오늘의 목표들을 되돌아보는 시간이에요!',
          data: { type: 'retrospect' },
        },
        trigger: {
          type: 'date',
          date: targetTime,
        } as any,
      });
      
      console.log(`📝 회고 알림 설정: ${targetTime.toLocaleString('ko-KR')}`);
      return true;
    } catch (error) {
      console.error('❌ 회고 알림 설정 실패:', error);
      return false;
    }
  }

  /**
   * 특정 알림 취소
   */
  async cancelNotification(identifier: string): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`🔕 알림 취소: ${identifier}`);
    } catch (error) {
      // 취소 실패는 로그만 남기고 계속 진행
      console.log(`⚠️ 알림 취소 실패: ${identifier}`);
    }
  }

  /**
   * 모든 알림 취소
   */
  async cancelAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;
    
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('🧹 모든 알림 취소 완료');
    } catch (error) {
      console.error('❌ 모든 알림 취소 실패:', error);
    }
  }

  /**
   * 현재 예약된 알림 확인
   */
  async getAllScheduledNotifications(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('🌐 웹 환경에서는 알림 확인 불가');
      return;
    }

    try {
      const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      console.log(`📋 현재 예약된 알림 총 ${allNotifications.length}개`);
      
      if (allNotifications.length === 0) {
        console.log('✅ 예약된 알림이 없습니다');
        return;
      }
      
      // 알림 상세 정보 출력
      allNotifications.forEach((notification, index) => {
        const { content, trigger } = notification;
        const triggerDate = trigger && trigger.type === 'date' ? trigger.date : '즉시';
        
        console.log(`📱 알림 ${index + 1}:`, {
          ID: notification.identifier,
          제목: content.title,
          내용: content.body,
          예약시간: triggerDate instanceof Date ? triggerDate.toLocaleString('ko-KR') : triggerDate,
          데이터: content.data
        });
      });
      
      // 목표 알림과 회고 알림 분류
      const goalNotifications = allNotifications.filter(n => n.content.data?.goalId);
      const retrospectNotifications = allNotifications.filter(n => n.content.data?.type === 'retrospect');
      
      console.log(`🎯 목표 알림: ${goalNotifications.length}개`);
      console.log(`📝 회고 알림: ${retrospectNotifications.length}개`);
      console.log(`❓ 기타 알림: ${allNotifications.length - goalNotifications.length - retrospectNotifications.length}개`);
      
    } catch (error) {
      console.error('❌ 예약된 알림 확인 실패:', error);
    }
  }
}

// 싱글톤 인스턴스 export
export const notificationManager = NotificationManager.getInstance();