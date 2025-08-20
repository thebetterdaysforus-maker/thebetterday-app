// 🔔 알림 상태 표시 카드
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { simpleNotificationManager } from '../utils/simpleNotificationManager';

interface NotificationStatusCardProps {
  style?: object;
}

export const NotificationStatusCard: React.FC<NotificationStatusCardProps> = ({ style }) => {
  const [systemStatus, setSystemStatus] = useState({
    isInitialized: false,
    isEnhancedMode: false,
    platform: 'unknown'
  });
  const [notificationCount, setNotificationCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    try {
      await simpleNotificationManager.initialize();
      
      // 단순화된 상태 정보
      setSystemStatus({
        isInitialized: true,
        isEnhancedMode: false, // 단순 알림 시스템
        platform: 'mobile'
      });
      
      await simpleNotificationManager.getAllScheduledNotifications();
      setNotificationCount(0); // 단순 시스템에서는 개수 표시 간소화
    } catch (error) {
      console.error('알림 상태 확인 실패:', error);
    }
  };

  const getStatusIcon = () => {
    if (!systemStatus.isInitialized) return 'notifications-off';
    if (systemStatus.isEnhancedMode) return 'notifications';
    return 'notifications-outline';
  };

  const getStatusColor = () => {
    if (!systemStatus.isInitialized) return '#FF6B6B';
    if (systemStatus.isEnhancedMode) return '#4ECDC4';
    return '#FFA726';
  };

  const getStatusText = () => {
    if (!systemStatus.isInitialized) return '알림 시스템 비활성화';
    if (systemStatus.isEnhancedMode) return '강화된 알림 활성화';
    return '기본 알림 활성화';
  };

  const getDetailText = () => {
    if (systemStatus.isEnhancedMode) {
      return `Development Build • ${notificationCount}개 예약됨`;
    } else if (systemStatus.isInitialized) {
      return `Expo Go • ${notificationCount}개 예약됨`;
    } else {
      return '알림 권한을 확인해주세요';
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.card, style]} 
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={getStatusIcon()} 
            size={24} 
            color={getStatusColor()} 
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          <Text style={styles.detailText}>{getDetailText()}</Text>
        </View>
        <Ionicons 
          name={isExpanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#666" 
        />
      </View>
      
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>플랫폼:</Text>
            <Text style={styles.infoValue}>{systemStatus.platform}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>환경:</Text>
            <Text style={styles.infoValue}>
              {systemStatus.isEnhancedMode ? 'Development Build' : 'Expo Go'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>예약된 알림:</Text>
            <Text style={styles.infoValue}>{notificationCount}개</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={checkNotificationStatus}
          >
            <Ionicons name="refresh" size={16} color="#7B68EE" />
            <Text style={styles.refreshText}>상태 새로고침</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E6FF',
  },
  refreshText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#7B68EE',
    fontWeight: '500',
  },
});
