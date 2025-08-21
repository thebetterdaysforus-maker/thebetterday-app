// src/store/authStore.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { supabase, supabaseUrl } from '../supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

interface AuthState {
  isAutoLoginEnabled: boolean;
  enableAutoLogin: () => Promise<void>;
  disableAutoLogin: () => Promise<void>;
  checkAutoLogin: () => Promise<boolean>;
  performAutoLogin: () => Promise<boolean>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signInAsGuest: () => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAutoLoginEnabled: true,

  enableAutoLogin: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await AsyncStorage.setItem('auto_login', 'true');
        await AsyncStorage.setItem('user_session', JSON.stringify(session));
        set({ isAutoLoginEnabled: true });
        // 자동 로그인 활성화됨
      }
    } catch (error) {
      if (__DEV__) console.error('자동 로그인 활성화 실패:', error);
    }
  },

  disableAutoLogin: async () => {
    try {
      await AsyncStorage.removeItem('auto_login');
      await AsyncStorage.removeItem('user_session');
      set({ isAutoLoginEnabled: false });
      // 자동 로그인 비활성화됨
    } catch (error) {
      if (__DEV__) console.error('자동 로그인 비활성화 실패:', error);
    }
  },

  checkAutoLogin: async () => {
    try {
      const autoLogin = await AsyncStorage.getItem('auto_login');
      const enabled = autoLogin !== 'false'; // 기본값을 true로 설정
      set({ isAutoLoginEnabled: enabled });
      return enabled;
    } catch (error) {
      console.error('자동 로그인 확인 실패:', error);
      return true; // 오류 시에도 기본값을 true로
    }
  },

  performAutoLogin: async () => {
    try {
      // 자동 로그인 프로세스 시작
      
      // 자동 로그인이 비활성화되어 있으면 바로 false 반환
      const autoLogin = await AsyncStorage.getItem('auto_login');
      // 자동 로그인 설정 확인됨
      
      if (autoLogin === 'false') {
        // 자동 로그인이 비활성화됨
        return false;
      }

      // 게스트 세션 먼저 확인
      const guestSession = await AsyncStorage.getItem('guest_session');
      if (guestSession) {
        try {
          const session = JSON.parse(guestSession);
          console.log('🎭 Guest session found - validating');
          
          if (session?.user?.is_anonymous && session?.access_token && session?.refresh_token) {
            console.log('🎭 게스트 세션 복원 시도...');
            
            // Supabase에 게스트 세션 설정
            const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            });
            
            if (!setSessionError && sessionData?.session) {
              console.log('✅ Guest session restored successfully');
              
              // 게스트 프로필이 존재하는지 확인
              const { data: guestProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', sessionData.session.user.id)
                .single();

              if (profileError || !guestProfile) {
                console.log('🎭 게스트 프로필 없음 - ProfileSetup으로 이동');
              } else {
                console.log('🎭 기존 게스트 프로필 확인됨');
              }
              
              return true;
            } else {
              console.log('⚠️ 게스트 세션 복원 실패:', setSessionError?.message);
              console.log('🗑️ 만료된 게스트 세션 삭제');
              await AsyncStorage.removeItem('guest_session');
            }
          } else {
            console.log('⚠️ 잘못된 게스트 세션 형식 또는 토큰 누락');
            await AsyncStorage.removeItem('guest_session');
          }
        } catch (error) {
          console.error('❌ 게스트 세션 파싱 오류:', error);
          await AsyncStorage.removeItem('guest_session');
        }
      } else {
        console.log('📝 게스트 세션 없음');
      }

      // 저장된 일반 세션 확인
      const savedSession = await AsyncStorage.getItem('user_session');
      console.log('🔍 저장된 세션:', savedSession ? '있음' : '없음');
      
      if (!savedSession) {
        console.log('❌ 저장된 세션 없음');
        return false;
      }

      // 현재 세션 확인
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      console.log('🔍 현재 Supabase 세션:', currentSession ? '있음' : '없음');
      
      if (error) {
        console.log('❌ 세션 확인 오류:', error.message);
        return false;
      }
      
      if (!currentSession) {
        // 저장된 세션으로 복원 시도
        try {
          const parsedSession = JSON.parse(savedSession);
          console.log('🔄 저장된 세션으로 복원 시도...');
          
          // 세션 복원 시도에 타임아웃 설정
          const sessionPromise = supabase.auth.setSession({
            access_token: parsedSession.access_token,
            refresh_token: parsedSession.refresh_token
          });
          
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('세션 복원 타임아웃')), 5000)
          );
          
          const sessionResult = await Promise.race([sessionPromise, timeoutPromise]);
          const { data, error: setError } = sessionResult;
          
          if (setError) {
            console.log('❌ 세션 복원 실패:', setError.message);
            // 실패한 세션 정보 삭제
            await AsyncStorage.removeItem('user_session');
            return false;
          }
          
          console.log('✅ 세션 복원 성공');
          return true;
        } catch (parseError) {
          console.log('❌ 세션 파싱/복원 오류:', parseError);
          // 손상된 세션 정보 삭제
          await AsyncStorage.removeItem('user_session');
          await AsyncStorage.removeItem('auto_login');
          return false;
        }
      }

      console.log('✅ 자동 로그인 성공 - 현재 세션 유효');
      return true;
    } catch (error) {
      console.error('❌ 자동 로그인 실패:', error);
      return false;
    }
  },

  signInWithGoogle: async () => {
    try {
      console.log('🔄 Google 로그인 시작...');
      
      // Supabase OAuth 사용 (웹 클라이언트 ID로 설정)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ OAuth URL 생성 실패:', error);
        return { success: false, error: error.message };
      }

      if (!data?.url) {
        console.error('❌ OAuth URL이 없습니다');
        return { success: false, error: 'OAuth URL 생성 실패' };
      }

      console.log('🌐 Google OAuth initialized');
      
      // URL 분석
      try {
        const urlObj = new URL(data.url);
        console.log('🔍 OAuth parameters configured');
        console.log('- OAuth parameters configured');
      } catch (e) {
        console.log('OAuth configuration validated');
      }

      // 웹 브라우저에서 Google OAuth 열기
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        `${supabaseUrl}/auth/v1/callback`
      );

      if (result.type === 'cancel') {
        console.log('🚫 사용자가 Google 로그인을 취소했습니다');
        return { success: false, error: '로그인이 취소되었습니다' };
      }

      if (result.type !== 'success') {
        console.error('❌ Google 로그인 실패:', result);
        return { success: false, error: 'Google 로그인에 실패했습니다' };
      }

      console.log('✅ Google OAuth callback received');

      // URL에서 세션 정보 추출 시도
      const callbackUrl = result.url;
      console.log('🔍 Processing authentication callback');
      
      // Supabase 세션 자동 처리 대기 (더 긴 시간)
      let attempts = 0;
      const maxAttempts = 40; // 20초로 증가
      
      while (attempts < maxAttempts) {
        try {
          // 세션 새로고침 시도
          const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
          
          if (!sessionError && sessionData?.session) {
            console.log('✅ 세션 새로고침으로 Google 로그인 확인됨');
            const session = sessionData.session;
            
            // 프로필 처리
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            const isNewUser = !profile || !!profileError;
            console.log('👤 사용자 상태:', isNewUser ? '신규 사용자' : '기존 사용자');

            if (isNewUser && session.user) {
              const user = session.user;
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  user_id: user.id,
                  email: user.email,
                  display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자',
                  google_id: user.user_metadata?.sub,
                  profile_picture_url: user.user_metadata?.avatar_url,
                  created_at: new Date().toISOString(),
                });

              if (createError) {
                console.error('❌ 프로필 생성 실패:', createError);
              } else {
                console.log('✅ Google 사용자 프로필 생성 완료');
              }
            }

            await AsyncStorage.setItem('auto_login', 'true');
            await AsyncStorage.setItem('user_session', JSON.stringify(session));

            return { 
              success: true, 
              isNewUser: Boolean(isNewUser)
            };
          }
          
          // 일반 세션 확인
          const { data: session } = await supabase.auth.getSession();
          if (session?.session) {
            console.log('✅ 일반 세션으로 Google 로그인 확인됨');
            
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.session.user.id)
              .single();

            const isNewUser = !profile || !!profileError;
            console.log('👤 사용자 상태:', isNewUser ? '신규 사용자' : '기존 사용자');

            if (isNewUser && session.session.user) {
              const user = session.session.user;
              const { error: createError } = await supabase
                .from('profiles')
                .insert({
                  user_id: user.id,
                  email: user.email,
                  display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자',
                  google_id: user.user_metadata?.sub,
                  profile_picture_url: user.user_metadata?.avatar_url,
                  created_at: new Date().toISOString(),
                });

              if (createError) {
                console.error('❌ 프로필 생성 실패:', createError);
              } else {
                console.log('✅ Google 사용자 프로필 생성 완료');
              }
            }

            await AsyncStorage.setItem('auto_login', 'true');
            await AsyncStorage.setItem('user_session', JSON.stringify(session.session));

            return { 
              success: true, 
              isNewUser: Boolean(isNewUser)
            };
          }
        } catch (error) {
          console.log('🔄 세션 확인 재시도...', attempts + 1);
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('⚠️ Expo Go 환경에서는 Google 로그인 제한이 있을 수 있습니다');
      console.log('📱 실제 배포 시에는 정상 작동합니다');
      return { success: false, error: 'Expo Go 환경에서는 OAuth 세션 처리에 제한이 있습니다' };

    } catch (error) {
      console.error('❌ Google 로그인 오류:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Google 로그인 중 오류가 발생했습니다' 
      };
    }
  },

  signInAsGuest: async () => {
    try {
      console.log('🚀 게스트 로그인 시작...');
      
      // 기존 게스트 세션 확인
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession?.user?.is_anonymous) {
        console.log('✅ 기존 게스트 세션 유지');
        await AsyncStorage.setItem('guest_session', JSON.stringify(existingSession));
        return { success: true };
      }
      
      // 새로운 익명 로그인
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ 게스트 로그인 실패:', error.message);
        return { success: false, error: error.message };
      }
      
      if (data.session) {
        console.log('✅ 게스트 로그인 성공');
        
        // 게스트 세션을 AsyncStorage에 저장하여 지속성 확보
        await AsyncStorage.setItem('guest_session', JSON.stringify(data.session));
        console.log('💾 게스트 세션 저장 완료');
        
        // 게스트 프로필은 ProfileSetup 화면에서 생성하도록 변경
        console.log('🎭 게스트 모드: ProfileSetup으로 이동 예정');
        
        // 게스트도 자동 로그인 활성화
        await AsyncStorage.setItem('auto_login', 'true');
        await AsyncStorage.setItem('user_session', JSON.stringify(data.session));
        console.log('✅ 게스트 자동 로그인 활성화');
        
        return { success: true };
      }
      
      return { success: false, error: '게스트 세션 생성 실패' };
    } catch (error) {
      console.error('❌ 게스트 로그인 오류:', error);
      return { success: false, error: '게스트 로그인 중 오류가 발생했습니다.' };
    }
  },
}));

export default useAuthStore;
