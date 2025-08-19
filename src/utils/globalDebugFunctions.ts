// 🔧 전역 디버깅 함수들 - 통합 관리
import { simpleNotificationManager } from './simpleNotificationManager';

/**
 * 전역 디버깅 함수들을 window 객체에 등록
 * 콘솔에서 직접 호출 가능한 유틸리티 함수들
 */
export const registerGlobalDebugFunctions = () => {
  if (__DEV__ && typeof window !== 'undefined') {
    // 알림 확인 및 관리 함수들
    (window as any).checkNotifications = async () => {
      console.log('🔍 현재 예약된 알림 확인 시작');
      await simpleNotificationManager.getAllScheduledNotifications();
    };

    (window as any).clearAllNotifications = async () => {
      console.log('🧹 모든 알림 삭제 시작');
      await simpleNotificationManager.cancelAllNotifications();
    };

    // 시간 디버깅 함수
    (window as any).checkTime = () => {
      const now = new Date();
      const koreaOffset = 9 * 60;
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const koreaTime = new Date(utcTime + (koreaOffset * 60000));
      const todayKey = koreaTime.toISOString().slice(0, 10);
      const tomorrowKey = new Date(koreaTime.getTime() + 86400000).toISOString().slice(0, 10);
      
      console.log('🕐 시간 정보:', {
        UTC시간: now.toISOString(),
        한국시간: koreaTime.toISOString(),
        오늘키: todayKey,
        내일키: tomorrowKey
      });
      
      return { UTC시간: now.toISOString(), 한국시간: koreaTime.toISOString(), 오늘키: todayKey, 내일키: tomorrowKey };
    };

    // 목표 만료 강제 실행 함수
    (window as any).forceExpireGoals = async () => {
      console.log('⚡ 목표 만료 강제 실행 중...');
      try {
        if ((window as any).goalStore?.getState) {
          const store = (window as any).goalStore.getState();
          await store.expireOverdueGoals();
          console.log('✅ 목표 만료 처리 완료');
          return true;
        } else {
          console.error('❌ goalStore를 찾을 수 없습니다');
          return false;
        }
      } catch (error) {
        console.error('❌ 목표 만료 처리 중 오류:', error);
        return false;
      }
    };

    // 레거시 함수들 (호환성 유지)
    (window as any).emergencyCleanupNotifications = async () => {
      console.log('🚨 긴급 알림 정리 시작');
      await simpleNotificationManager.cancelAllNotifications();
    };

    console.log('🔧 디버깅용 함수 등록 완료');
    console.log('💡 사용 가능한 함수:');
    console.log('  - checkNotifications() : 예약된 알림 확인');
    console.log('  - clearAllNotifications() : 모든 알림 삭제');
    console.log('  - checkTime() : 현재 시간 정보 확인');
    console.log('  - forceExpireGoals() : 목표 만료 강제 실행');
  }
};
