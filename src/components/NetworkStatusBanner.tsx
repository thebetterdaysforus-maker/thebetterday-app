// 🌐 네트워크 상태 표시 배너
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { offlineDataManager } from '../utils/offlineDataManager';

interface NetworkStatusBannerProps {
  style?: any;
}

export const NetworkStatusBanner: React.FC<NetworkStatusBannerProps> = ({ style }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [syncQueueCount, setSyncQueueCount] = useState(0);

  useEffect(() => {
    let intervalId: any;
    
    const checkNetworkStatus = async () => {
      const online = await offlineDataManager.isOnline();
      setIsOnline(online);
      
      // 동기화 대기 중인 항목 수 확인
      const queue = await offlineDataManager['getSyncQueue']();
      setSyncQueueCount(queue.length);
    };

    // 초기 체크
    checkNetworkStatus();
    
    // 5초마다 네트워크 상태 체크 (빠른 동기화)
    intervalId = setInterval(checkNetworkStatus, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  // 온라인이고 동기화할 항목이 없으면 배너 숨김
  if (isOnline && syncQueueCount === 0) {
    return null;
  }

  return (
    <View style={[styles.banner, !isOnline ? styles.offlineBanner : styles.syncBanner, style]}>
      <Text style={styles.bannerText}>
        {!isOnline 
          ? '🔄 오프라인 모드 - 온라인 복구 시 자동 동기화됩니다'
          : `🔄 ${syncQueueCount}개 항목 동기화 대기 중...`
        }
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  offlineBanner: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFECB5',
    borderWidth: 1,
  },
  syncBanner: {
    backgroundColor: '#D1ECF1',
    borderColor: '#BEE5EB',
    borderWidth: 1,
  },
  bannerText: {
    fontSize: 14,
    color: '#495057',
    textAlign: 'center',
  },
});