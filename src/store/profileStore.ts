import { create } from 'zustand';
import { supabase } from '../supabaseClient';

export interface Profile {
  id: string;            // auth.uid()
  display_name: string;
  dream: string;
  created_at: string;
}

interface ProfileState {
  profile: Profile | null;
  /** true = 프로필 이미 있음, false = 없음 */
  fetchProfile: () => Promise<boolean>;
  saveProfile: (display_name: string, dream: string, referrer?: string) => Promise<void>;
  updateDream: (dream: string) => Promise<void>;
}

const useProfileStore = create<ProfileState>((set) => ({
  profile: null,

  fetchProfile: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return false;
      }
      console.error('Error fetching profile:', error);
      return false;
    }

    set({ profile: data });
    return true;
  },

  saveProfile: async (display_name: string, dream: string, referrer?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    try {
      const profile: any = {
        id: session.user.id,
        display_name,
        dream,
        created_at: new Date().toISOString(),
      };

      // referrer가 제공되면 추가
      if (referrer) {
        profile.referrer = referrer;
      }

      // profiles 테이블의 id 컬럼이 이미 auth.users를 참조하므로 별도 users 테이블 불필요

      const { error } = await supabase
        .from('profiles')
        .upsert([profile]);

      if (error) {
        console.error('프로필 저장 오류:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`프로필 저장 실패: ${error.message}`);
      }

      set({ profile });
    } catch (error: any) {
      console.error('프로필 저장 중 오류:', {
        message: error?.message || '알 수 없는 오류',
        stack: error?.stack
      });
      throw error;
    }
  },

  updateDream: async (dream: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    try {
      // 단순 업데이트 (updated_at 필드 제거)
      const { error } = await supabase
        .from('profiles')
        .update({ dream })
        .eq('id', session.user.id);

      if (error) {
        console.error('꿈 업데이트 오류:', error);
        throw error;
      }

      // 로컬 상태 업데이트 (덮어쓰기 방식)
      set(state => ({
        profile: state.profile ? { 
          ...state.profile, 
          dream
        } : null
      }));
    } catch (error) {
      console.error('꿈 저장 실패:', error);
      throw error;
    }
  },
}));

export default useProfileStore;
