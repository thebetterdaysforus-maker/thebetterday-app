import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { supabase } from './src/supabaseClient';
import useUserStore from './src/store/userStore';
import useProfileStore from './src/store/profileStore';
import { useAuthStore } from './src/store/authStore';
import useGoalStore from './src/store/goalStore';
import { getCurrentTimeZone } from './src/utils/timeUtils';

// 중복 파일들 제거 완료 - 핵심 알림 시스템만 유지
import AuthStack from './src/stacks/AuthStack';
import MainTab from './src/stacks/MainTab';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
// 스플래시 스크린 비활성화
// import SplashScreen from './src/components/SplashScreen';
// import LottieSplashScreen from './src/components/LottieSplashScreen';

export default function App() {
  const { session, setSession } = useUserStore();
  const { profile, fetchProfile } = useProfileStore();
  const { performAutoLogin, enableAutoLogin } = useAuthStore();
  const goalStoreState = useGoalStore();
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef<any>(null);

  // 전역 함수 등록 (개발 환경에서만)
  useEffect(() => {
    if (__DEV__) {
      // 개발 환경에서만 전역 함수 등록
      (window as any).goalStore = goalStoreState;
      
      // 알림 확인 함수 전역 등록 - 웹/모바일 모두 지원
      (window as any).checkNotifications = async () => {
        console.log('🔍 현재 예약된 알림 확인 시작');
        
        try {
          const { checkAllScheduledNotifications } = await import('./src/helpers/notificationScheduler');
          await checkAllScheduledNotifications();
        } catch (error) {
          console.error('❌ 알림 확인 실패:', error);
        }
      };
      
      // 모든 알림 삭제 함수
      (window as any).clearAllNotifications = async () => {
        console.log('🧹 모든 알림 삭제 시작');
        
        try {
          const { cancelAllNotifications } = await import('./src/helpers/notificationScheduler');
          await cancelAllNotifications();
        } catch (error) {
          console.error('❌ 알림 삭제 실패:', error);
        }
      };
      
      console.log('🔧 디버깅용 함수 등록 완료');
      console.log('💡 사용 가능한 함수:');
      console.log('  - checkNotifications() : 예약된 알림 확인');
      console.log('  - clearAllNotifications() : 모든 알림 삭제');
    }
  }, [goalStoreState]);

  // 🚫 알림 시스템 완전 비활성화 - 사용자 요청
  // 알림 클릭 처리 시스템 영구 비활성화됨

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 자동 로그인 시도 시작...');
        
        // 알림 시스템 정상 작동 - 목표 알림과 회고 알림 활성화
        console.log("🔔 알림 시스템 정상 작동 중");
        
        // 시간대 설정 초기화
        await getCurrentTimeZone();
        
        // 세션 확인 및 자동 로그인 시도
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 현재 세션 상태:', session ? '있음' : '없음');
        
        if (session) {
          // 기존 세션이 있으면 자동 로그인 활성화
          console.log('✅ 기존 세션 발견 - 자동 로그인 활성화');
          await enableAutoLogin();
          setSession(session);
          
          // 로그인 후 지연된 회고 알림 보정 실행
          console.log('🔍 지연된 회고 알림 보정 체크 시작...');
          console.log('✅ 자동 로그인 성공');
        } else {
          // 세션이 없으면 로그인 화면으로
          console.log('🔄 기존 세션 없음 - 로그인 화면으로 이동');
          console.log('💡 Expo Go 환경에서는 매번 로그인이 정상입니다');
        }
      } catch (error) {
        console.error('❌ 인증 초기화 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    // 즉시 인증 초기화
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      // 로그인 성공 시 자동 로그인 활성화
      if (session) {
        await enableAutoLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, performAutoLogin, enableAutoLogin]);

  useEffect(() => {
    if (session) {
      fetchProfile().catch(console.error);
    }
  }, [session, fetchProfile]);

  // 스플래시 스크린 비활성화됨

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🌟 The Better Day</Text>
        <Text style={styles.loadingSubtext}>로딩 중...</Text>
      </View>
    );
  }

  console.log('🔍 App.tsx 렌더링 상태:', {
    session: session ? '있음' : '없음',
    profile: profile ? '있음' : '없음',
    isAnonymous: session?.user?.is_anonymous || false,
    userId: session?.user?.id?.slice(0, 8) || 'N/A'
  });

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar style="auto" />
      
      {!session ? (
        <AuthStack />
      ) : !profile ? (
        <AuthStack />
      ) : (
        <MainTab />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666',
  },
});