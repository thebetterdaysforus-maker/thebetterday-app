// 📱 단순화된 앱 생명주기 관리 - 불필요한 백그라운드 로직 제거
import { useEffect, useRef } from 'react';
import { AppState, Platform, AppStateStatus } from 'react-native';

export const useAppLifecycle = () => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // 🚫 웹 환경에서는 작동하지 않음
    if (Platform.OS === 'web') return;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      appState.current = nextAppState;
      
      // 최소한의 로깅만 유지
      if (nextAppState === 'active') {
        console.log('📱 앱 활성화');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => subscription?.remove();
  }, []);

  return {
    isActive: appState.current === 'active'
  };
};