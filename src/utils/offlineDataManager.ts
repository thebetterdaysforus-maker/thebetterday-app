// 🔄 오프라인 데이터 관리자
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goal, Retrospect } from '../types/goal';
import { getKoreaTime, getTodayKorea } from './timeUtils';

interface PendingSync {
  id: string;
  type: 'create_goal' | 'update_goal' | 'create_retrospect';
  data: any;
  timestamp: number;
}

/**
 * 오프라인 데이터 관리 클래스
 * - 네트워크 없이도 앱 기능 사용 가능
 * - 온라인 복구 시 자동 동기화
 */
export class OfflineDataManager {
  private static instance: OfflineDataManager;
  private syncQueue: PendingSync[] = [];
  
  static getInstance(): OfflineDataManager {
    if (!OfflineDataManager.instance) {
      OfflineDataManager.instance = new OfflineDataManager();
    }
    return OfflineDataManager.instance;
  }

  /**
   * 오프라인 목표 생성
   */
  async createGoalOffline(goalData: Partial<Goal>): Promise<Goal> {
    const offlineGoal: Goal = {
      id: `offline_${Date.now()}`,
      user_id: goalData.user_id || 'offline_user',
      title: goalData.title || '',
      target_time: goalData.target_time || '',
      status: 'pending',
      created_at: getKoreaTime().toISOString(),
      updated_at: getKoreaTime().toISOString(),
      is_essential: goalData.is_essential || false,
      essential_category: goalData.essential_category || null,
      ...goalData
    } as Goal;

    // 로컬 저장
    await this.saveOfflineGoal(offlineGoal);
    
    // 동기화 큐에 추가
    await this.addToSyncQueue({
      id: offlineGoal.id,
      type: 'create_goal',
      data: offlineGoal,
      timestamp: Date.now()
    });

    console.log(`💾 오프라인 목표 생성: ${offlineGoal.title}`);
    return offlineGoal;
  }

  /**
   * 오프라인 목표 체크
   */
  async checkGoalOffline(goalId: string, status: 'success' | 'failure'): Promise<boolean> {
    try {
      const goals = await this.getOfflineGoals();
      const goalIndex = goals.findIndex(g => g.id === goalId);
      
      if (goalIndex === -1) {
        console.error('❌ 오프라인 목표를 찾을 수 없습니다:', goalId);
        return false;
      }

      // 목표 상태 업데이트
      goals[goalIndex].status = status;
      goals[goalIndex].updated_at = getKoreaTime().toISOString();
      
      // 로컬 저장
      await AsyncStorage.setItem('offline_goals', JSON.stringify(goals));
      
      // 동기화 큐에 추가
      await this.addToSyncQueue({
        id: `update_${goalId}_${Date.now()}`,
        type: 'update_goal',
        data: { id: goalId, status, updated_at: goals[goalIndex].updated_at },
        timestamp: Date.now()
      });

      console.log(`✅ 오프라인 목표 체크: ${goalId} -> ${status}`);
      return true;
    } catch (error) {
      console.error('❌ 오프라인 목표 체크 실패:', error);
      return false;
    }
  }

  /**
   * 오프라인 회고 생성
   */
  async createRetrospectOffline(retrospectData: Partial<Retrospect>): Promise<Retrospect> {
    const offlineRetrospect: Retrospect = {
      id: `offline_retrospect_${Date.now()}`,
      user_id: retrospectData.user_id || 'offline_user',
      date: retrospectData.date || getTodayKorea(),
      content: retrospectData.content || '',
      created_at: getKoreaTime().toISOString(),
      updated_at: getKoreaTime().toISOString(),
      ...retrospectData
    } as Retrospect;

    // 로컬 저장
    await this.saveOfflineRetrospect(offlineRetrospect);
    
    // 동기화 큐에 추가
    await this.addToSyncQueue({
      id: offlineRetrospect.id,
      type: 'create_retrospect',
      data: offlineRetrospect,
      timestamp: Date.now()
    });

    console.log(`📝 오프라인 회고 생성: ${offlineRetrospect.date}`);
    return offlineRetrospect;
  }

  /**
   * 오프라인 목표 목록 가져오기
   */
  async getOfflineGoals(): Promise<Goal[]> {
    try {
      const storedGoals = await AsyncStorage.getItem('offline_goals');
      return storedGoals ? JSON.parse(storedGoals) : [];
    } catch (error) {
      console.error('❌ 오프라인 목표 로드 실패:', error);
      return [];
    }
  }

  /**
   * 오프라인 회고 가져오기
   */
  async getOfflineRetrospects(): Promise<Retrospect[]> {
    try {
      const storedRetrospects = await AsyncStorage.getItem('offline_retrospects');
      return storedRetrospects ? JSON.parse(storedRetrospects) : [];
    } catch (error) {
      console.error('❌ 오프라인 회고 로드 실패:', error);
      return [];
    }
  }

  /**
   * 네트워크 상태 확인
   */
  async isOnline(): Promise<boolean> {
    try {
      // 간단한 네트워크 테스트
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 온라인 복구 시 동기화
   */
  async syncWhenOnline(supabaseClient: any): Promise<void> {
    const isOnline = await this.isOnline();
    if (!isOnline) {
      console.log('🔄 오프라인 상태 - 동기화 대기');
      return;
    }

    const queue = await this.getSyncQueue();
    if (queue.length === 0) {
      console.log('✅ 동기화할 데이터 없음');
      return;
    }

    console.log(`🔄 동기화 시작: ${queue.length}개 항목`);
    const syncedItems: string[] = [];

    for (const item of queue) {
      try {
        switch (item.type) {
          case 'create_goal':
            await this.syncGoalCreate(supabaseClient, item);
            break;
          case 'update_goal':
            await this.syncGoalUpdate(supabaseClient, item);
            break;
          case 'create_retrospect':
            await this.syncRetrospectCreate(supabaseClient, item);
            break;
        }
        syncedItems.push(item.id);
        console.log(`✅ 동기화 완료: ${item.type} - ${item.id}`);
      } catch (error) {
        console.error(`❌ 동기화 실패: ${item.type} - ${item.id}`, error);
      }
    }

    // 동기화 완료된 항목들 큐에서 제거
    await this.removeSyncedItems(syncedItems);
    console.log(`🎉 동기화 완료: ${syncedItems.length}/${queue.length}개`);
  }

  // Private 메서드들
  private async saveOfflineGoal(goal: Goal): Promise<void> {
    const goals = await this.getOfflineGoals();
    const existingIndex = goals.findIndex(g => g.id === goal.id);
    
    if (existingIndex >= 0) {
      goals[existingIndex] = goal;
    } else {
      goals.push(goal);
    }
    
    await AsyncStorage.setItem('offline_goals', JSON.stringify(goals));
  }

  private async saveOfflineRetrospect(retrospect: Retrospect): Promise<void> {
    const retrospects = await this.getOfflineRetrospects();
    const existingIndex = retrospects.findIndex(r => r.id === retrospect.id);
    
    if (existingIndex >= 0) {
      retrospects[existingIndex] = retrospect;
    } else {
      retrospects.push(retrospect);
    }
    
    await AsyncStorage.setItem('offline_retrospects', JSON.stringify(retrospects));
  }

  private async addToSyncQueue(item: PendingSync): Promise<void> {
    const queue = await this.getSyncQueue();
    queue.push(item);
    await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
  }

  private async getSyncQueue(): Promise<PendingSync[]> {
    try {
      const storedQueue = await AsyncStorage.getItem('sync_queue');
      return storedQueue ? JSON.parse(storedQueue) : [];
    } catch (error) {
      console.error('❌ 동기화 큐 로드 실패:', error);
      return [];
    }
  }

  private async removeSyncedItems(syncedIds: string[]): Promise<void> {
    const queue = await this.getSyncQueue();
    const remainingQueue = queue.filter(item => !syncedIds.includes(item.id));
    await AsyncStorage.setItem('sync_queue', JSON.stringify(remainingQueue));
  }

  private async syncGoalCreate(supabaseClient: any, item: PendingSync): Promise<void> {
    // 오프라인 ID를 실제 ID로 변환
    const { id, ...goalData } = item.data;
    const { data, error } = await supabaseClient
      .from('goals')
      .insert(goalData);
    
    if (error) throw error;
  }

  private async syncGoalUpdate(supabaseClient: any, item: PendingSync): Promise<void> {
    const { id, ...updateData } = item.data;
    const { error } = await supabaseClient
      .from('goals')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  }

  private async syncRetrospectCreate(supabaseClient: any, item: PendingSync): Promise<void> {
    const { id, ...retrospectData } = item.data;
    const { data, error } = await supabaseClient
      .from('retrospects')
      .insert(retrospectData);
    
    if (error) throw error;
  }
}

// 전역 인스턴스
export const offlineDataManager = OfflineDataManager.getInstance();