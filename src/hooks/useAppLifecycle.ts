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
          // dynamic import 제거 - 앱 활성화 알림 정리 기능은 개발 중
          console.log('📱 앱 활성화 알림 정리는 개발 중입니다.');
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