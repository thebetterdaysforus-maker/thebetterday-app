import { AppState, AppStateStatus } from 'react-native';
import { masterDataManager } from '../store/masterDataManager';
import { supabase } from '../supabaseClient';

/**
 * 🚀 스마트 동기화 매니저
 * 
 * 사용자 동작과 앱 상태에 따른 지능형 동기화 시스템
 * - 사용자 동작 시: 즉시 동기화
 * - 앱 활성화 시: 즉시 동기화
 * - 백그라운드에서: 30초 간격으로 최소 동기화
 * - 비활성화 시: 동기화 중단
 */
class SmartSyncManager {
  private isActive = false;
  private backgroundSyncInterval: any = null;
  private lastSyncTime = 0;
  private syncInProgress = false;
  private pendingUserActions: string[] = [];

  // 동기화 설정 (성능 최적화)
  private readonly BACKGROUND_SYNC_INTERVAL = 120000; // 2분 (성능 향상)
  private readonly MIN_SYNC_INTERVAL = 50; // 사용자 활동 중 50ms 간격 (🚀 극초고속 반응)
  private readonly MAX_PENDING_ACTIONS = 5; // 사용자 동작 감지 개선

  constructor() {
    this.setupAppStateListener();
  }

  /**
   * 앱 상태 변화 감지
   */
  private setupAppStateListener() {
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * 앱 상태 변화 처리
   */
  private async handleAppStateChange(nextAppState: AppStateStatus) {
    console.log(`📱 앱 상태 변화: ${this.isActive ? 'active' : 'background'} → ${nextAppState}`);

    const wasActive = this.isActive;
    this.isActive = nextAppState === 'active';

    if (this.isActive && !wasActive) {
      // 백그라운드에서 복귀 → 즉시 동기화
      console.log('🔥 앱 활성화 - 즉시 동기화 시작');
      await this.performImmediateSync('app_resume');
      this.startBackgroundSync();
    } else if (!this.isActive && wasActive) {
      // 앱이 백그라운드로 이동
      console.log('⏸️ 앱 비활성화 - 백그라운드 동기화 중단');
      this.stopBackgroundSync();
      
      // 마지막 동기화 (대기 중인 동작들만)
      if (this.pendingUserActions.length > 0) {
        await this.performImmediateSync('app_background');
      }
    }
  }

  /**
   * 사용자 동작 기반 즉시 동기화
   */
  async onUserAction(actionType: string, details?: any) {
    console.log(`👆 사용자 동작: ${actionType}`);
    
    // 동작 기록
    this.pendingUserActions.push(actionType);
    if (this.pendingUserActions.length > this.MAX_PENDING_ACTIONS) {
      this.pendingUserActions.shift(); // 오래된 동작 제거
    }

    // 즉시 동기화 (앱이 활성화된 경우에만)
    if (this.isActive) {
      await this.performImmediateSync(`user_action:${actionType}`, details);
    }
  }

  /**
   * 즉시 동기화 실행
   */
  private async performImmediateSync(reason: string, details?: any) {
    const now = Date.now();
    
    // 🚀 중요한 동기화는 강제 실행 (간격 제한 무시)
    const isCriticalSync = reason.includes('app_resume') || reason.includes('app_active') || reason.includes('foreground');
    
    if (!isCriticalSync && (this.syncInProgress || (now - this.lastSyncTime) < this.MIN_SYNC_INTERVAL)) {
      console.log(`⏭️ 동기화 스킵: ${reason} (진행중 또는 간격 부족)`);
      return;
    }
    
    // 🚀 중요한 동기화는 기존 동기화 종료 대기 후 실행
    if (isCriticalSync && this.syncInProgress) {
      console.log(`🚀 중요 동기화 대기: ${reason}`);
      let retries = 0;
      while (this.syncInProgress && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms마다 확인
        retries++;
      }
    }

    this.syncInProgress = true;
    this.lastSyncTime = now;

    try {
      console.log(`🔄 즉시 동기화 시작: ${reason}`);
      const startTime = Date.now();
      
      // 사용자 동작에 따른 선택적 동기화
      if (reason.startsWith('user_action:')) {
        await this.performSelectiveSync(reason, details);
      } else {
        // 전체 동기화 (앱 복귀, 네트워크 복구 등)
        await masterDataManager.syncAllData();
      }

      const duration = Date.now() - startTime;
      console.log(`✅ 즉시 동기화 완료: ${reason} (${duration}ms)`);
      
      // 성공적인 동기화 후 대기 동작 초기화
      this.pendingUserActions = [];

    } catch (error) {
      console.error(`❌ 즉시 동기화 실패: ${reason}`, error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 사용자 동작에 따른 선택적 동기화
   */
  private async performSelectiveSync(reason: string, details?: any) {
    const actionType = reason.replace('user_action:', '');
    
    switch (actionType) {
      case 'goal_create':
      case 'goal_update':
      case 'goal_complete':
        console.log('🎯 목표 관련 동기화');
        await masterDataManager['syncGoals']();
        await masterDataManager['syncRetrospects'](); // 회고도 함께
        break;
        
      case 'retrospect_create':
      case 'retrospect_update':
        console.log('📝 회고 관련 동기화');
        await masterDataManager['syncRetrospects']();
        break;
        
      case 'community_post':
      case 'community_like':
        console.log('👥 커뮤니티 관련 동기화');
        await masterDataManager['syncCommunityData']();
        break;
        
      case 'profile_update':
        console.log('👤 프로필 관련 동기화');
        await masterDataManager['syncProfile']();
        break;
        
      case 'flexible_goal_create':
      case 'flexible_goal_update':
        console.log('🎨 유연한 목표 관련 동기화');
        await masterDataManager['syncFlexibleGoals']();
        break;
        
      default:
        // 알 수 없는 동작은 최소 동기화
        console.log('🔄 기본 동기화');
        await masterDataManager['syncGoals']();
        break;
    }
  }

  /**
   * 백그라운드 주기적 동기화 시작
   */
  private startBackgroundSync() {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
    }

    console.log(`⏰ 백그라운드 동기화 시작 (${this.BACKGROUND_SYNC_INTERVAL/1000}초 간격)`);
    
    this.backgroundSyncInterval = setInterval(async () => {
      if (this.isActive && !this.syncInProgress) {
        // 대기 중인 사용자 동작이 있거나 일정 시간이 지났을 때만 동기화
        const timeSinceLastSync = Date.now() - this.lastSyncTime;
        const shouldSync = this.pendingUserActions.length > 0 || timeSinceLastSync > 300000; // 5분 (성능 향상)

        if (shouldSync) {
          console.log('⏰ 백그라운드 주기적 동기화');
          await this.performLightSync();
        }
      }
    }, this.BACKGROUND_SYNC_INTERVAL);
  }

  /**
   * 백그라운드 동기화 중단
   */
  private stopBackgroundSync() {
    if (this.backgroundSyncInterval) {
      clearInterval(this.backgroundSyncInterval);
      this.backgroundSyncInterval = null;
      console.log('⏸️ 백그라운드 동기화 중단');
    }
  }

  /**
   * 가벼운 동기화 (백그라운드용)
   */
  private async performLightSync() {
    try {
      console.log('🪶 가벼운 동기화 시작');
      const startTime = Date.now();
      
      // 오프라인 큐만 동기화 (서버 데이터는 가져오지 않음)
      const { offlineDataManager } = await import('./offlineDataManager');
      const queue = await offlineDataManager['getSyncQueue']();
      
      if (queue.length > 0) {
        await offlineDataManager.syncWhenOnline(supabase);
        console.log(`🪶 가벼운 동기화 완료: ${queue.length}개 항목 (${Date.now() - startTime}ms)`);
      } else {
        console.log('🪶 가벼운 동기화: 동기화할 항목 없음');
      }
      
    } catch (error) {
      console.error('❌ 가벼운 동기화 실패:', error);
    }
  }

  /**
   * 수동 전체 동기화 (새로고침 버튼 등)
   */
  async forceFullSync() {
    console.log('🔄 수동 전체 동기화 요청');
    await this.performImmediateSync('manual_force_sync');
  }

  /**
   * 동기화 상태 정보
   */
  getSyncStatus() {
    return {
      isActive: this.isActive,
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      pendingActions: this.pendingUserActions.length,
      backgroundSyncActive: this.backgroundSyncInterval !== null
    };
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    this.stopBackgroundSync();
    this.pendingUserActions = [];
    console.log('🧹 SmartSyncManager 정리 완료');
  }
}

// 싱글톤 인스턴스
export const smartSyncManager = new SmartSyncManager();

// 편의 함수들
export const syncOnUserAction = (actionType: string, details?: any) => {
  return smartSyncManager.onUserAction(actionType, details);
};

export const forceFullSync = () => {
  return smartSyncManager.forceFullSync();
};

export const getSyncStatus = () => {
  return smartSyncManager.getSyncStatus();
};