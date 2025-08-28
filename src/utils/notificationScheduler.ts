// 📱 간소화된 알림 스케줄러 - 단순 관리자 사용
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal } from '../store/goalStore';
import { simpleNotificationManager } from './simpleNotificationManager';

export const requestNotificationPermission = async (): Promise<boolean> => {
  await simpleNotificationManager.initialize();
  return await simpleNotificationManager.requestPermission();
};

export const scheduleGoalAlarm = async (goalId: string, title: string, targetTime: Date): Promise<void> => {
  if (__DEV__) console.log('🔔 목표 알림 설정:', {
    목표: title,
    설정시간: targetTime.toISOString(),
    ID: goalId
  });

  // 목표 시간 검증
  const nowKorea = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const targetKorea = new Date(targetTime.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  
  if (isNaN(targetTime.getTime())) {
    if (__DEV__) console.log('❌ 잘못된 목표 시간 형식:', targetTime);
    return;
  }
  
  if (targetKorea <= nowKorea) {
    if (__DEV__) console.log('⏰ 목표 시간이 이미 지나서 알림 설정 안함:', targetKorea.toLocaleString('ko-KR'));
    return;
  }

  if (__DEV__) console.log('✅ 유효한 목표 시간 확인:', targetKorea.toLocaleString('ko-KR'));

  // 사용자 알림 설정 확인
  const settingsString = await AsyncStorage.getItem('notificationSettings');
  const settings = settingsString ? JSON.parse(settingsString) : { goalAlarms: true };
  
  if (!settings.goalAlarms) {
    if (__DEV__) console.log(`🔕 목표 알림 비활성화됨: ${title}`);
    return;
  }

  // 단순 알림 관리자를 통한 단일 알림 설정 (목표시간 -5분)
  await simpleNotificationManager.initialize();
  await simpleNotificationManager.scheduleGoalNotification(goalId, title, targetTime);
};

export const cancelGoalAlarm = async (goalId: string): Promise<void> => {
  await simpleNotificationManager.cancelGoalNotifications(goalId);
};

// 회고 알림 관련 함수들
export const scheduleRetrospectReminderImmediate = async (): Promise<void> => {
  const nowKorea = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  const reminderTime = new Date(nowKorea.getTime() + 30 * 60 * 1000); // 30분 후 (한국시간 기준)
  await simpleNotificationManager.initialize();
  await simpleNotificationManager.scheduleRetrospectNotification(reminderTime);
};

export const scheduleRetrospectReminder = async (targetTime: Date): Promise<void> => {
  await simpleNotificationManager.initialize();
  await simpleNotificationManager.scheduleRetrospectNotification(targetTime);
};

export const cancelRetrospectReminder = async (): Promise<void> => {
  await simpleNotificationManager.cancelRetrospectNotification();
};

// 알림 확인 및 관리 함수들
export const getAllScheduledNotifications = async (): Promise<void> => {
  await simpleNotificationManager.getAllScheduledNotifications();
};

export const cancelAllNotifications = async (): Promise<void> => {
  await simpleNotificationManager.cancelAllNotifications();
};

export const safeNotificationCleanup = async (): Promise<void> => {
  try {
    await simpleNotificationManager.cancelAllNotifications();
    console.log('✅ 안전한 알림 정리 완료');
  } catch (error) {
    console.error('❌ 알림 정리 중 오류:', error);
  }
};

// 레거시 함수들 (호환성 유지)
export const checkAllScheduledNotifications = async (): Promise<void> => {
  await getAllScheduledNotifications();
};

export const emergencyNotificationCleanupForApp = async (): Promise<void> => {
  console.log('🚨 긴급 알림 정리 시작');
  await cancelAllNotifications();
};