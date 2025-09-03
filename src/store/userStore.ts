import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

interface UserState {
  session: Session | null;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  initializeAuth: () => Promise<void>;
  signInWithGoogleToken: (idToken: string) => Promise<void>; // ✅ 추가
}

const useUserStore = create<UserState>((set) => ({
  session: null,
  initialized: false,

  signIn: async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  },

  signUp: async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ session: null });
  },

  setSession: (session: Session | null) => {
    set({ session });
  },

  initializeAuth: async () => {
    console.log('🔍 웹/앱 인증 초기화 시작...');

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔍 현재 세션 상태:', session ? '있음' : '없음');

      if (error) {
        console.error('❌ 세션 확인 오류:', error);
        set({ session: null, initialized: true });
        return;
      }

      if (session) {
        console.log('✅ 기존 세션 발견 - 자동 로그인 성공');
        set({ session, initialized: true });
      } else {
        console.log('🔄 세션 없음 - 로그인 필요');
        set({ session: null, initialized: true });
      }
    } catch (error) {
      console.error('❌ 인증 초기화 오류:', error);
      set({ session: null, initialized: true });
    }
  },

  // ✅ Google ID 토큰을 받아 Supabase 로그인 처리
  signInWithGoogleToken: async (idToken: string) => {
    console.log('🔑 Google ID 토큰으로 Supabase 로그인 시도...');
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      set({ session: data.session });
      console.log('✅ Google 로그인 성공:', data.session?.user?.email);
    } catch (err) {
      console.error('❌ Google 로그인 실패:', err);
      throw err;
    }
  },
}));

export default useUserStore;
