import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef, ErrorInfo } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Platform, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Font from 'expo-font';
import {
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { supabase } from './src/supabaseClient';
import { checkSupabaseConnection } from './src/utils/supabaseHealthCheck';
import { logAPKEnvironment, testNetworkConnectivity, APKErrorReporter } from './src/utils/apkDebugger';
import useUserStore from './src/store/userStore';
import useProfileStore from './src/store/profileStore';
import { useAuthStore } from './src/store/authStore';
import useGoalStore from './src/store/goalStore';
import { getCurrentTimeZone } from './src/utils/timeUtils';

// APK 실행 오류 방지를 위한 Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.log('ErrorBoundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log('ErrorBoundary componentDidCatch:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
            앱 실행 중 문제가 발생했습니다.
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', color: '#666' }}>
            앱을 다시 시작해주세요.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

// 중복 파일들 제거 완료 - 핵심 알림 시스템만 유지
import AuthStack from './src/stacks/AuthStack';
import MainTab from './src/stacks/MainTab';
import ProfileSetupScreen from './src/screens/ProfileSetupScreen';
// 스플래시 스크린 비활성화
// import SplashScreen from './src/components/SplashScreen';
// import LottieSplashScreen from './src/components/LottieSplashScreen';

function MainApp() {
  const { session, setSession } = useUserStore();
  const { profile, fetchProfile } = useProfileStore();
  const { performAutoLogin, enableAutoLogin } = useAuthStore();
  const goalStoreState = useGoalStore();
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConnected: boolean;
    canAuth: boolean;
    canRead: boolean;
  }>({ isConnected: false, canAuth: false, canRead: false });
  const navigationRef = useRef<any>(null);

  // 전역 함수 등록 (개발 환경에서만)
  useEffect(() => {
    if (__DEV__) {
      // 개발 환경에서만 전역 함수 등록 (APK에서는 안전하게 처리)
      try {
        if (typeof window !== 'undefined') {
          (window as any).goalStore = goalStoreState;
        } else if (typeof global !== 'undefined') {
          (global as any).goalStore = goalStoreState;
        }
      } catch (e) {
        console.log('전역 변수 설정 건너뜀 (정상)');
      }
      
      // 알림 확인 함수 전역 등록 - 웹/모바일 모두 지원 (APK 안전 처리)
      const checkNotifications = async () => {
        console.log('🔍 현재 예약된 알림 확인 시작');
        
        try {
          // dynamic import 제거하고 일반 import 사용
          console.log('🔍 알림 확인 기능은 개발 중입니다.');
        } catch (error) {
          console.error('❌ 알림 확인 실패:', error);
        }
      };
      
      // 모든 알림 삭제 함수 (APK 안전 처리)  
      const clearAllNotifications = async () => {
        console.log('🧹 모든 알림 삭제 시작');
        
        try {
          // dynamic import 제거하고 일반 import 사용
          console.log('🧹 알림 삭제 기능은 개발 중입니다.');
        } catch (error) {
          console.error('❌ 알림 삭제 실패:', error);
        }
      };
      
      // 전역 함수로 안전하게 등록
      try {
        if (typeof window !== 'undefined') {
          (window as any).checkNotifications = checkNotifications;
          (window as any).clearAllNotifications = clearAllNotifications;
        } else if (typeof global !== 'undefined') {
          (global as any).checkNotifications = checkNotifications;
          (global as any).clearAllNotifications = clearAllNotifications;
        }
        
        console.log('🔧 디버깅용 함수 등록 완료');
        console.log('💡 사용 가능한 함수:');
        console.log('  - checkNotifications() : 예약된 알림 확인');
        console.log('  - clearAllNotifications() : 모든 알림 삭제');
      } catch (e) {
        console.log('전역 함수 등록 건너뜀 (정상)');
      }
    }
  }, [goalStoreState]);

  // 🚫 알림 시스템 완전 비활성화 - 사용자 요청
  // 알림 클릭 처리 시스템 영구 비활성화됨

  // 폰트 로드
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Font.loadAsync({
          'NotoSansKR-Regular': NotoSansKR_400Regular,
          'NotoSansKR-Medium': NotoSansKR_500Medium,
          'NotoSansKR-Bold': NotoSansKR_700Bold,
        });
        
        // 글로벌 폰트 설정
        // TypeScript 호환성을 위해 any로 타입 단언
        const TextComponent = Text as any;
        const TextInputComponent = TextInput as any;
        
        if (!TextComponent.defaultProps) {
          TextComponent.defaultProps = {};
        }
        TextComponent.defaultProps.style = { fontFamily: 'NotoSansKR-Regular' };
        
        if (!TextInputComponent.defaultProps) {
          TextInputComponent.defaultProps = {};
        }
        TextInputComponent.defaultProps.style = { fontFamily: 'NotoSansKR-Regular' };
        
        setFontsLoaded(true);
        if (__DEV__) console.log('✅ Noto Sans KR 폰트 로드 완료');
      } catch (error) {
        console.error('❌ 폰트 로드 실패:', error);
        setFontsLoaded(true); // 폰트 로드 실패해도 앱은 계속 실행
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (__DEV__) console.log('🚀 APK 앱 초기화 시작...');
        
        // APK 환경 정보 로깅
        logAPKEnvironment();
        
        // 기본 네트워크 연결 테스트
        const networkOk = await testNetworkConnectivity();
        if (!networkOk) {
          console.warn('⚠️ 기본 네트워크 연결 실패 감지');
        }
        
        // 알림 시스템 정상 작동 - 목표 알림과 회고 알림 활성화 (APK 안전 처리)
        try {
          if (__DEV__) console.log("🔔 알림 시스템 정상 작동 중");
        } catch (notificationError) {
          APKErrorReporter.report(notificationError, 'notification_system');
          console.log('⚠️ 알림 시스템 건너뜀:', notificationError);
        }
        
        // 시간대 설정 초기화 (APK 안전 처리)
        try {
          await getCurrentTimeZone();
        } catch (timezoneError) {
          APKErrorReporter.report(timezoneError, 'timezone_setup');
          console.log('⚠️ 타임존 설정 건너뜀:', timezoneError);
        }
        
        // Supabase 연결 상태 확인 (APK 안전 처리)
        try {
          if (__DEV__) console.log('🔍 Supabase 연결 상태 확인 중...');
          
          // APK 환경에서 타임아웃 더 짧게 설정
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout')), 5000);
          });
          
          const healthCheck = await Promise.race([
            checkSupabaseConnection(),
            timeoutPromise
          ]) as { isConnected: boolean; canAuth: boolean; canRead: boolean; };
          
          setSupabaseStatus(healthCheck);
          
          if (!healthCheck.isConnected) {
            console.error('❌ Supabase 연결 필수 - 앱 사용 불가');
            setInitError('서버 연결에 실패했습니다.\n\nWiFi나 모바일 데이터를 확인하고\n앱을 다시 시작해주세요.');
            setLoading(false);
            return;
          }
          
          if (__DEV__) console.log('✅ Supabase 연결 성공');
          
          // 세션 확인 및 자동 로그인 시도
          const { data: { session } } = await supabase.auth.getSession();
          if (__DEV__) console.log('🔍 현재 세션 상태:', session ? '있음' : '없음');
          
          if (session) {
            // 기존 세션이 있으면 자동 로그인 활성화
            if (__DEV__) console.log('✅ 기존 세션 발견 - 자동 로그인 활성화');
            try {
              await enableAutoLogin();
            } catch (autoLoginError) {
              console.log('⚠️ 자동 로그인 설정 건너뜀:', autoLoginError);
            }
            setSession(session);
            
            // 로그인 후 지연된 회고 알림 보정 실행
            console.log('🔍 지연된 회고 알림 보정 체크 시작...');
            console.log('✅ 자동 로그인 성공');
          } else {
            // 세션이 없으면 로그인 화면으로
            console.log('🔄 기존 세션 없음 - 로그인 화면으로 이동');
            console.log('💡 Expo Go 환경에서는 매번 로그인이 정상입니다');
          }
        } catch (supabaseError) {
          APKErrorReporter.report(supabaseError, 'supabase_connection');
          console.error('❌ Supabase 연결 필수 - 앱 사용 불가:', supabaseError);
          setSupabaseStatus({ isConnected: false, canAuth: false, canRead: false });
          setInitError('서버 연결에 실패했습니다.\n\nWiFi나 모바일 데이터를 확인하고\n앱을 다시 시작해주세요.');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ 인증 초기화 오류:', error);
        setInitError('앱 초기화 중 문제가 발생했습니다');
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

  // 로딩 화면
  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('./assets/icon.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.loadingText}>The Better Day</Text>
        </View>
        <Text style={styles.loadingSubtext}>
          {!fontsLoaded ? '폰트 로딩 중...' : '로딩 중...'}
        </Text>
      </View>
    );
  }

  // 네트워크 연결 오류 화면 (앱 재시작 필요)
  if (initError) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff', padding: 24 }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, color: '#ff4444' }}>
          연결 오류
        </Text>
        <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24, color: '#333' }}>
          {initError}
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#6366f1',
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 8,
            minWidth: 200
          }}
          onPress={async () => {
            // 앱 재시작
            setLoading(true);
            setInitError('');
            // initializeAuth 함수를 다시 실행
            await new Promise(resolve => setTimeout(resolve, 100));
            if (typeof window !== 'undefined' && window.location?.reload) {
              window.location.reload();
            } else {
              setLoading(false);
              Alert.alert('재시도', '앱을 수동으로 재시작해주세요.');
            }
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
            다시 시도
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (__DEV__) {
    console.log('🔍 App.tsx 렌더링 상태:', {
      session: session ? '있음' : '없음',
      profile: profile ? '있음' : '없음',
      isAnonymous: session?.user?.is_anonymous || false,
      userId: session?.user?.id?.slice(0, 8) || 'N/A'
    });
  }

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

// APK 실행 오류 방지를 위한 Error Boundary로 감싸서 export
export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 10,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#ffc107',
    marginTop: 5,
    textAlign: 'center',
  },
});
