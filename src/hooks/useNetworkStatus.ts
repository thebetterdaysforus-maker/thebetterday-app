// 🌐 네트워크 상태 훅
import { useState, useEffect } from 'react';
import { offlineDataManager } from '../utils/offlineDataManager';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const checkStatus = async () => {
      setIsChecking(true);
      try {
        const online = await offlineDataManager.isOnline();
        setIsOnline(online);
        
        // 동기화 대기 항목 수 확인
        const queue = await offlineDataManager['getSyncQueue']();
        setSyncQueueCount(queue.length);
      } catch (error) {
        console.error('네트워크 상태 확인 실패:', error);
        setIsOnline(false);
      } finally {
        setIsChecking(false);
      }
    };

    // 초기 체크
    checkStatus();
    
    // 5초마다 체크 (앱 시작 시 빠른 동기화)
    intervalId = setInterval(checkStatus, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const forceSync = async (supabaseClient: any) => {
    if (isOnline) {
      await offlineDataManager.syncWhenOnline(supabaseClient);
      // 동기화 후 상태 업데이트
      const queue = await offlineDataManager['getSyncQueue']();
      setSyncQueueCount(queue.length);
    }
  };

  return {
    isOnline,
    syncQueueCount,
    isChecking,
    forceSync,
    needsSync: syncQueueCount > 0
  };  
};