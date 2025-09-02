// 🔄 마스터 데이터 관리자 - 9개 Store 충돌 해결
import { supabase } from '../supabaseClient';
import useGoalStore from './goalStore';
import useProfileStore from './profileStore';
import useRetrospectStore from './retrospectStore';
import useCommunityStore from './communityStore';
import { useAnalyticsStore } from './analyticsStore';
import { useFlexibleGoalStore } from './flexibleGoalStore';
import { useMotivationMessageStore } from './motivationMessageStore';

class MasterDataManager {
  private static instance: MasterDataManager;
  private isInitializing = false;
  private lastSyncTime = 0;
  private session: any = null;

  static getInstance(): MasterDataManager {
    if (!MasterDataManager.instance) {
      MasterDataManager.instance = new MasterDataManager();
    }
    return MasterDataManager.instance;
  }

  /**
   * 🔥 APK 안전한 전체 데이터 동기화
   * 한 번의 세션 확인으로 모든 Store 업데이트
   */
  async syncAllData(): Promise<boolean> {
    if (this.isInitializing) {
      console.log('🔄 이미 초기화 중 - 대기');
      return false;
    }

    const now = Date.now();
    if (now - this.lastSyncTime < 3000) {
      console.log('🔄 3초 이내 재동기화 방지');
      return false;
    }

    this.isInitializing = true;
    this.lastSyncTime = now;

    try {
      console.log('🔄 마스터 데이터 동기화 시작');

      // 단일 세션 확인
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ 세션 오류:', error);
        return false;
      }

      if (!session) {
        console.log('🚫 세션 없음 - 모든 Store 초기화');
        this.clearAllStores();
        return false;
      }

      this.session = session;
      console.log('✅ 세션 확인 완료');

      // ⚡ 즉시 데이터 로딩 우선 - 실시간 구독은 백그라운드에서
      const { realtimeManager } = await import('../utils/realtimeManager');
      if (!realtimeManager.isActive()) {
        // 백그라운드에서 비동기 실행 (동기화 속도에 영향 없음)
        realtimeManager.startRealtimeSubscriptions(session.user.id).catch(err => {
          console.log('🔴 실시간 구독 실패 (백그라운드):', err);
        });
      }

      // 병렬 데이터 동기화 (순서 보장)
      const syncResults = await Promise.allSettled([
        this.syncProfile(),
        this.syncGoals(),
        this.syncRetrospects(),
        this.syncCommunityData(),
        this.syncFlexibleGoals()
      ]);

      let successCount = 0;
      syncResults.forEach((result, index) => {
        const storeName = ['Profile', 'Goals', 'Retrospects', 'Community', 'FlexibleGoals'][index];
        if (result.status === 'fulfilled') {
          successCount++;
          console.log(`✅ ${storeName} 동기화 성공`);
        } else {
          console.error(`❌ ${storeName} 동기화 실패:`, result.reason);
        }
      });

      console.log(`🔄 마스터 동기화 완료: ${successCount}/5 성공`);
      return successCount >= 3; // 60% 이상 성공하면 OK

    } catch (error) {
      console.error('❌ 마스터 동기화 실패:', error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  private async syncProfile(): Promise<void> {
    if (!this.session) return;
    
    const profileStore = useProfileStore.getState();
    await profileStore.fetchProfile();
  }

  private async syncGoals(): Promise<void> {
    if (!this.session) return;
    
    const goalStore = useGoalStore.getState();
    await goalStore.fetchGoals();
  }

  private async syncRetrospects(): Promise<void> {
    if (!this.session) return;
    
    const retrospectStore = useRetrospectStore.getState();
    await retrospectStore.fetchToday();
  }

  private async syncCommunityData(): Promise<void> {
    if (!this.session) return;
    
    const communityStore = useCommunityStore.getState();
    await Promise.all([
      communityStore.fetchMyResolution(),
      communityStore.fetchResolutions()
    ]);
  }

  private async syncFlexibleGoals(): Promise<void> {
    if (!this.session) return;
    
    const flexibleStore = useFlexibleGoalStore.getState();
    await flexibleStore.fetchGoals();
  }

  private clearAllStores(): void {
    console.log('🧹 모든 Store 초기화');
    
    useGoalStore.getState().clearAllGoals?.();
    useRetrospectStore.getState().clearAllRetrospects?.();
    // 커뮤니티 스토어 초기화는 기본 reset 함수 사용
    useFlexibleGoalStore.getState().clearAllFlexibleGoals?.();
    
    useProfileStore.setState({ profile: null });
  }

  /**
   * 🔄 오프라인 데이터 통합 동기화
   */
  async syncOfflineData(): Promise<boolean> {
    try {
      // 1. 오프라인 큐 동기화 먼저 실행
      const { offlineDataManager } = await import('../utils/offlineDataManager');
      await offlineDataManager.syncWhenOnline(supabase);
      
      // 2. 모든 Store 데이터 새로고침
      return await this.syncAllData();
    } catch (error) {
      console.error('❌ 오프라인 데이터 동기화 실패:', error);
      return false;
    }
  }

  /**
   * 앱 시작시 한 번만 실행
   */
  async initializeOnAppStart(): Promise<boolean> {
    console.log('🚀 앱 시작 통합 초기화');
    return await this.syncOfflineData();
  }

  /**
   * 네트워크 복구시 실행
   */
  async syncOnNetworkRestore(): Promise<boolean> {
    console.log('🌐 네트워크 복구 통합 동기화');
    return await this.syncOfflineData();
  }

  /**
   * 백그라운드 복귀시 실행
   */
  async syncOnAppResume(): Promise<boolean> {
    console.log('📱 앱 복귀 동기화');
    return await this.syncOfflineData();
  }
}

export const masterDataManager = MasterDataManager.getInstance();