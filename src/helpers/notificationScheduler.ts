// 📱 간소화된 알림 스케줄러 - 통합 관리자 사용
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from '../store/goalStore';
import { UnifiedNotificationManager } from '../utils/unifiedNotificationManager';

const notificationManager = UnifiedNotificationManager.getInstance();

export const requestNotificationPermission = async (): Promise<boolean> => {
  return await notificationManager.requestPermission();
};

export const scheduleGoalAlarm = async (goalId: string, title: string, targetTime: Date, userDisplayName?: string): Promise<void> => {
  console.log('🔔 목표 알림 설정:', {
    목표: title,
    설정시간: targetTime.toISOString(),
    ID: goalId
  });

  // 목표 시간 검증
  const now = new Date();
  
  if (isNaN(targetTime.getTime())) {
    console.log('❌ 잘못된 목표 시간 형식:', targetTime);
    return;
  }
  
  if (targetTime <= now) {
    console.log('⏰ 목표 시간이 이미 지나서 알림 설정 안함:', targetTime.toLocaleString('ko-KR'));
    return;
  }

  console.log('✅ 유효한 목표 시간 확인:', targetTime.toLocaleString('ko-KR'));

  // 사용자 알림 설정 확인
  const settingsString = await AsyncStorage.getItem('notificationSettings');
  const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true };
  
  if (!settings.goalAlarms) {
    console.log(`🔕 목표 알림 비활성화됨: ${title}`);
    return;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.log(`🚫 알림 권한 없음: ${title}`);
    return;
  }

  // 통합 알림 관리자를 통한 알림 설정
  await notificationManager.scheduleGoalNotification(goalId, title, targetTime);
};

export const cancelGoalAlarm = async (goalId: string): Promise<void> => {
  await notificationManager.cancelNotification(goalId);
};

// 회고 알림 관련 함수들
export const scheduleRetrospectReminderImmediate = async (): Promise<void> => {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30분 후
  await notificationManager.scheduleRetrospectNotification(reminderTime);
};

export const scheduleRetrospectReminder = async (targetTime: Date): Promise<void> => {
  await notificationManager.scheduleRetrospectNotification(targetTime);
};

export const cancelRetrospectReminder = async (): Promise<void> => {
  await notificationManager.cancelNotification('retrospect-reminder');
};

// 알림 확인 및 관리 함수들
export const getAllScheduledNotifications = async (): Promise<void> => {
  await notificationManager.getAllScheduledNotifications();
};

export const cancelAllNotifications = async (): Promise<void> => {
  await notificationManager.cancelAllNotifications();
};

export const safeNotificationCleanup = async (): Promise<void> => {
  console.log('🛡️ 안전한 알림 정리 시작');
  await notificationManager.cancelAllNotifications();
};

// 레거시 함수들 (호환성 유지)
export const checkAllScheduledNotifications = async (): Promise<void> => {
  await getAllScheduledNotifications();
};

export const emergencyNotificationCleanupForApp = async (): Promise<void> => {
  console.log('🚨 긴급 알림 정리 시작');
  await cancelAllNotifications();
};