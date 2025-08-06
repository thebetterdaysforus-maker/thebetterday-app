// 🔧 알림 디버깅 화면
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NotificationStatusCard } from '../components/NotificationStatusCard';
import { unifiedNotificationManager } from '../utils/unifiedNotificationManager';
import useGoalStore from '../store/goalStore';

export default function NotificationDebugScreen({ navigation }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const { checkAllNotifications, cancelAllNotifications } = useGoalStore();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const scheduled = await unifiedNotificationManager.getScheduledNotifications();
      setNotifications(scheduled);
    } catch (error) {
      console.error('알림 로드 실패:', error);
    }
  };

  const handleTestBasicNotification = async () => {
    try {
      const testTime = new Date(Date.now() + 5000); // 5초 후
      await unifiedNotificationManager.scheduleGoalNotification(
        'test-basic',
        '기본 테스트 알림',
        testTime
      );
      Alert.alert('성공', '5초 후 기본 테스트 알림이 발송됩니다.');
      setTimeout(loadNotifications, 1000);
    } catch (error) {
      Alert.alert('실패', '기본 알림 테스트 실패: ' + String(error));
    }
  };

  const handleTestEnhancedNotification = async () => {
    try {
      const testTime = new Date(Date.now() + 10000); // 10초 후
      await unifiedNotificationManager.scheduleGoalNotification(
        'test-enhanced',
        '강화된 테스트 알림',
        testTime
      );
      Alert.alert('성공', '10초 후부터 3단계 테스트 알림이 발송됩니다.');
      setTimeout(loadNotifications, 1000);
    } catch (error) {
      Alert.alert('실패', '강화된 알림 테스트 실패: ' + String(error));
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await cancelAllNotifications();
      Alert.alert('성공', '모든 알림이 취소되었습니다.');
      loadNotifications();
    } catch (error) {
      Alert.alert('실패', '알림 취소 실패: ' + String(error));
    }
  };

  const formatNotificationTime = (trigger: any) => {
    if (trigger?.date) {
      return new Date(trigger.date).toLocaleString('ko-KR');
    }
    if (trigger?.seconds) {
      return `${trigger.seconds}초 후`;
    }
    return '시간 정보 없음';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>알림 디버깅</Text>
        <TouchableOpacity onPress={loadNotifications}>
          <Ionicons name="refresh" size={24} color="#7B68EE" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 시스템 상태 */}
        <NotificationStatusCard />

        {/* 테스트 버튼들 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>테스트</Text>
          
          <TouchableOpacity 
            style={styles.testButton} 
            onPress={handleTestBasicNotification}
          >
            <Ionicons name="notifications-outline" size={20} color="#4ECDC4" />
            <Text style={styles.testButtonText}>기본 알림 테스트 (5초 후)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.testButton} 
            onPress={handleTestEnhancedNotification}
          >
            <Ionicons name="notifications" size={20} color="#7B68EE" />
            <Text style={styles.testButtonText}>강화된 알림 테스트 (10초 후)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.testButton, styles.dangerButton]} 
            onPress={handleClearAllNotifications}
          >
            <Ionicons name="trash" size={20} color="#FF6B6B" />
            <Text style={[styles.testButtonText, styles.dangerText]}>모든 알림 취소</Text>
          </TouchableOpacity>
        </View>

        {/* 예약된 알림 목록 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>예약된 알림 ({notifications.length}개)</Text>
          
          {notifications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off" size={48} color="#CCC" />
              <Text style={styles.emptyText}>예약된 알림이 없습니다</Text>
            </View>
          ) : (
            notifications.map((notification, index) => (
              <View key={index} style={styles.notificationCard}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>
                    {notification.content.title}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {formatNotificationTime(notification.trigger)}
                  </Text>
                </View>
                <Text style={styles.notificationBody}>
                  {notification.content.body}
                </Text>
                <Text style={styles.notificationId}>
                  ID: {notification.identifier}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  testButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dangerButton: {
    borderColor: '#FFE0E0',
    backgroundColor: '#FFF8F8',
  },
  dangerText: {
    color: '#FF6B6B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  notificationId: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
});