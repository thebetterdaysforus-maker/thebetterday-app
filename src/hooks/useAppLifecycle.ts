// 📱 모바일 앱 생명주기 관리 - 스마트 알림 제어
import { useEffect, useRef } from 'react';
import { AppState, Platform, AppStateStatus } from 'react-native';
import { cancelGoalAlarm } from '../helpers/notificationScheduler';

export const useAppLifecycle = () => {
  const appState = useRef(AppState.currentState);
  const lastActiveTime = useRef(Date.now());

  useEffect(() => {
    // 🚫 웹 환경에서는 작동하지 않음
    if (Platform.OS === 'web') return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousState = appState.current;
      appState.current = nextAppState;

      // 앱이 백그라운드에서 포그라운드로 돌아올 때
      if (previousState.match(/inactive|background/) && nextAppState === 'active') {
        const now = Date.now();
        lastActiveTime.current = now;
        
        console.log('📱 앱이 활성화됨 - 불필요한 알림 정리');
        
        // 현재 시간 기준 5분 이내 목표 알림들 취소 (사용자가 이미 앱을 사용 중)
        try {
          const Notifications = await import('expo-notifications');
          const scheduled = await Notifications.default.getAllScheduledNotificationsAsync();
          
          let canceledCount = 0;
          for (const notification of scheduled) {
            if (notification.content.data?.goalId) {
              const trigger = notification.trigger as any;
              const triggerTime = trigger?.type === 'date' ? 
                new Date(trigger.date).getTime() : null;
              
              // 5분 이내 알림은 취소 (사용자가 앱을 사용 중이므로)
              if (triggerTime && Math.abs(triggerTime - now) < 5 * 60 * 1000) {
                await cancelGoalAlarm(notification.content.data.goalId as string);
                canceledCount++;
              }
            }
          }
          
          if (canceledCount > 0) {
            console.log(`🔕 앱 활성화로 ${canceledCount}개 알림 취소`);
          }
        } catch (error) {
          console.log('⚠️ 앱 활성화 알림 정리 실패:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, []);

  return {
    isActive: appState.current === 'active',
    lastActiveTime: lastActiveTime.current
  };
};