// 🔴 Supabase 실시간 동기화 관리자
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import useGoalStore from '../store/goalStore';
import useCommunityStore from '../store/communityStore';
import useRetrospectStore from '../store/retrospectStore';

class RealtimeManager {
  private static instance: RealtimeManager;
  private channels: Map<string, RealtimeChannel> = new Map();
  private isSubscribed = false;
  private userId: string | null = null;

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  /**
   * 🔴 실시간 구독 시작
   */
  async startRealtimeSubscriptions(userId: string): Promise<void> {
    if (this.isSubscribed && this.userId === userId) {
      console.log('🔴 이미 실시간 구독 중');
      return;
    }

    this.userId = userId;
    console.log('🔴 실시간 구독 시작:', userId.slice(0, 8));

    try {
      // 성능 최적화: 핵심 목표 테이블만 실시간 구독
      await this.subscribeToGoals(userId);
      
      // 커뮤니티와 회고는 페이지 진입 시에만 구독 (성능 향상)
      // await this.subscribeToCommunity(userId);
      // await this.subscribeToRetrospects(userId);

      this.isSubscribed = true;
      console.log('✅ 실시간 구독 완료 (최적화됨)');

    } catch (error) {
      console.error('❌ 실시간 구독 실패:', error);
    }
  }

  /**
   * 🎯 목표 테이블 실시간 구독
   */
  private async subscribeToGoals(userId: string): Promise<void> {
    const channelName = `goals_${userId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'goals',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('🔴 목표 실시간 변경 감지:', payload.eventType);
          
          // 성능 최적화: 디바운싱 및 필요한 경우에만 업데이트
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            // 즉시 업데이트하지 말고 1초 후에 업데이트 (성능 향상)
            setTimeout(() => {
              const goalStore = useGoalStore.getState();
              goalStore.fetchGoals().catch(console.error);
            }, 1000);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 목표 구독 상태:', status);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * 👥 커뮤니티 테이블 실시간 구독
   */
  private async subscribeToCommunity(userId: string): Promise<void> {
    const channelName = `community_${userId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'daily_resolutions'
        }, 
        (payload) => {
          console.log('🔴 커뮤니티 실시간 변경 감지:', payload.eventType);
          
          // 커뮤니티 데이터 새로고침
          const communityStore = useCommunityStore.getState();
          
          // 새 각고나 좋아요 변경시 목록 새로고침
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            communityStore.fetchResolutions().catch(console.error);
            
            // 내 각고 업데이트인지 확인
            const resolution = payload.new as any;
            if (resolution.user_id === userId) {
              communityStore.fetchMyResolution().catch(console.error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔴 커뮤니티 구독 상태:', status);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * 📝 회고 테이블 실시간 구독
   */
  private async subscribeToRetrospects(userId: string): Promise<void> {
    const channelName = `retrospects_${userId}`;
    
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'retrospects',
          filter: `user_id=eq.${userId}`
        }, 
        (payload) => {
          console.log('🔴 회고 실시간 변경 감지:', payload.eventType);
          
          // 회고 데이터 새로고침
          const retrospectStore = useRetrospectStore.getState();
          retrospectStore.fetchToday().catch(console.error);
        }
      )
      .subscribe((status) => {
        console.log('🔴 회고 구독 상태:', status);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * 🔴 실시간 구독 중지
   */
  async stopRealtimeSubscriptions(): Promise<void> {
    console.log('🔴 실시간 구독 중지');
    
    for (const [channelName, channel] of this.channels.entries()) {
      await supabase.removeChannel(channel);
      console.log(`🔴 채널 ${channelName} 구독 해제`);
    }
    
    this.channels.clear();
    this.isSubscribed = false;
    this.userId = null;
  }

  /**
   * 구독 상태 확인
   */
  isActive(): boolean {
    return this.isSubscribed && this.channels.size > 0;
  }
}

export const realtimeManager = RealtimeManager.getInstance();