import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useRef, ErrorInfo } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, Platform, Image, SafeAreaView, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Expo 알림 시스템 비활성화됨
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
import { getCurrentTime } from './src/utils/timeUtils';
import { smartSyncManager } from './src/utils/smartSyncManager';

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
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    isConnected: boolean;
    canAuth: boolean;
    canRead: boolean;
  }>({ isConnected: false, canAuth: false, canRead: false });
  const navigationRef = useRef<any>(null);

  // 첫 실행 여부 확인
  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        const hasLaunchedBefore = await AsyncStorage.getItem('hasLaunchedBefore');
        if (!hasLaunchedBefore) {
          console.log('🆕 첫 실행 감지 - Welcome 화면으로 이동');
          setIsFirstLaunch(true);
          await AsyncStorage.setItem('hasLaunchedBefore', 'true');
        } else {
          console.log('🔄 재실행 감지 - 기존 세션 복원 가능');
          setIsFirstLaunch(false);
        }
      } catch (error) {
        console.log('⚠️ 첫 실행 확인 실패:', error);
        setIsFirstLaunch(false);
      }
    };
    
    checkFirstLaunch();
  }, []);

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
      
      // 🔕 알림 시스템 비활성화됨 - 관련 전역 함수들 제거
      
      // 첫 실행 플래그 초기화 함수 (개발용)
      const resetFirstLaunchFlag = async () => {
        console.log('🔄 첫 실행 플래그 초기화 시작');
        try {
          await AsyncStorage.removeItem('hasLaunchedBefore');
          await supabase.auth.signOut();
          console.log('✅ 첫 실행 플래그 및 세션 초기화 완료');
          console.log('💡 앱을 다시 로드하면 Welcome 화면이 표시됩니다');
        } catch (error) {
          console.error('❌ 초기화 실패:', error);
        }
      };

      // 뱃지 디버깅 함수
      const createMissingBadges = async () => {
        console.log('🏆 누락된 뱃지 생성 함수 호출');
        try {
          await (goalStoreState as any).createMissingBadges();
        } catch (error) {
          console.error('❌ 뱃지 생성 실패:', error);
        }
      };
      
      // 전역 함수로 안전하게 등록
      try {
        if (typeof window !== 'undefined') {
          (window as any).createMissingBadges = createMissingBadges;
          (window as any).resetFirstLaunchFlag = resetFirstLaunchFlag;
        } else if (typeof global !== 'undefined') {
          (global as any).createMissingBadges = createMissingBadges;
          (global as any).resetFirstLaunchFlag = resetFirstLaunchFlag;
        }
        
        console.log('🔧 디버깅용 함수 등록 완료');
        console.log('💡 사용 가능한 함수:');
        console.log('  - createMissingBadges() : 완료된 목표의 뱃지 생성');
        console.log('  - resetFirstLaunchFlag() : 첫 실행 플래그 초기화 (Welcome 화면 테스트용)');
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
        
        // 🔕 알림 시스템 비활성화됨 (APK 최적화)
        if (__DEV__) {
          console.log("🔕 알림 시스템 비활성화됨 - 모듈 제거로 인한 최적화");
        }
        
        // 시간대 설정 초기화 (APK 안전 처리)
        try {
          const currentTime = getCurrentTime();
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
            // 세션 유효성 검증 - Authentication과 Profile 데이터 일치 확인
            if (__DEV__) console.log('✅ 기존 세션 발견 - 유효성 검증 중...');
            
            try {
              // Authentication 사용자 정보와 Profile 테이블 데이터 일치 여부 확인
              const { data: authUser, error: authError } = await supabase.auth.getUser();
              
              if (authError || !authUser.user) {
                console.log('❌ Authentication 사용자 정보 없음 - 세션 정리');
                // 유효하지 않은 세션이므로 정리
                await supabase.auth.signOut();
                setSession(null);
                // Profile 데이터도 정리
                await AsyncStorage.removeItem('hasLaunchedBefore');
                setIsFirstLaunch(true);
                setLoading(false);
                return;
              }
              
              // Profile 테이블에서 해당 사용자 확인 (게스트 모드는 예외)
              if (!authUser.user.is_anonymous) {
                // 정식 회원만 Profile 테이블 검증
                const { data: profile, error: profileError } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', authUser.user.id)
                  .single();
                
                if (profileError || !profile) {
                  console.log('❌ Profile 데이터 없음 또는 불일치 - 정리 후 재시작');
                  // Authentication에는 있지만 Profile에 없는 경우 - 세션 정리
                  await supabase.auth.signOut();
                  setSession(null);
                  await AsyncStorage.removeItem('hasLaunchedBefore');
                  setIsFirstLaunch(true);
                  setLoading(false);
                  return;
                }
              } else {
                // 게스트 모드 - AsyncStorage에서 프로필 복원 시도
                console.log('🎭 게스트 모드 - 로컬 프로필 복원 시도');
                try {
                  await fetchProfile(); // Profile Store에서 게스트 프로필 로드
                  console.log('✅ 게스트 프로필 복원 완료');
                } catch (guestProfileError) {
                  console.log('⚠️ 게스트 프로필 없음 - 프로필 설정 필요');
                }
              }
              
              console.log('✅ 세션 유효성 검증 완료 - 자동 로그인 활성화');
              await enableAutoLogin();
            } catch (validationError) {
              console.error('❌ 세션 검증 실패:', validationError);
              // 검증 실패 시 안전하게 초기화
              await supabase.auth.signOut();
              setSession(null);
              await AsyncStorage.removeItem('hasLaunchedBefore');
              setIsFirstLaunch(true);
              setLoading(false);
              return;
            }
            
            setSession(session);
            
            // 스마트 동기화 시스템 초기화
            console.log('🚀 스마트 동기화 시스템 활성화');
            // smartSyncManager는 자동으로 앱 상태 변화를 감지하여 동기화 관리
            
            // 로그인 후 즉시 동기화 실행
            console.log('🔄 앱 시작 시 즉시 동기화 시작...');
            try {
              const { offlineDataManager } = await import('./src/utils/offlineDataManager');
              await offlineDataManager.syncWhenOnline(supabase);
              console.log('✅ 앱 시작 동기화 완료');
            } catch (syncError) {
              console.log('⚠️ 앱 시작 동기화 건너뜀:', syncError);
            }
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

    // Listen for auth changes + 실시간 구독 관리
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      
      console.log('🔄 인증 상태 변경:', event, session ? '로그인' : '로그아웃');
      
      if (session) {
        // 로그인 시
        await enableAutoLogin();
        
        // 🔴 실시간 구독 시작
        const { realtimeManager } = await import('./src/utils/realtimeManager');
        await realtimeManager.startRealtimeSubscriptions(session.user.id);
        
      } else {
        // 로그아웃 시 실시간 구독 중지
        const { realtimeManager } = await import('./src/utils/realtimeManager');
        await realtimeManager.stopRealtimeSubscriptions();
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, performAutoLogin, enableAutoLogin]);

  // 🔄 통합 데이터 관리 시스템 적용 (게스트는 수동 프로필 설정 필수)
  useEffect(() => {
    if (session && !session.user.is_anonymous) {
      // 일반 로그인 사용자만 자동 동기화
      import('./src/store/masterDataManager').then(({ masterDataManager }) => {
        masterDataManager.syncAllData()
          .then((success) => {
            if (success) {
              console.log('✅ 앱 시작 데이터 동기화 완료');
              // 프로필 상태 강제 새로고침
              fetchProfile();
            } else {
              console.log('⚠️ 일부 데이터 동기화 실패');
            }
          })
          .catch(console.error);
      });
    } else if (session?.user.is_anonymous) {
      // 게스트 모드는 수동 프로필 설정 필수
      console.log('🎭 게스트 모드 - 수동 프로필 설정 대기');
    }
  }, [session, fetchProfile]);

  // 📱 앱 상태 변화 감지 및 백그라운드 복귀 시 동기화 재시작
  useEffect(() => {
    if (!session) return; // 세션이 없으면 동기화 불필요

    const handleAppStateChange = async (nextAppState: string) => {
      console.log(`📱 앱 상태 변화: ${AppState.currentState} → ${nextAppState}`);

      if (nextAppState === 'active' && AppState.currentState !== 'active') {
        console.log('🔥 앱 포그라운드 복귀 - 동기화 재시작');
        
        try {
          console.log('🔥 앱 포그라운드 복귀 - ⚡ 병렬 동기화 시작');
          
          // ⚡ 병렬 처리: 실시간 구독 재연결 + 데이터 동기화 동시 실행
          const tasks = [
            // 1. 실시간 구독 재연결 (항상 실행)
            (async () => {
              console.log('🔴 실시간 구독 재연결 중...');
              const { realtimeManager } = await import('./src/utils/realtimeManager');
              await realtimeManager.startRealtimeSubscriptions(session.user.id);
              console.log('✅ 실시간 구독 재연결 완료');
            })()
          ];
          
          // 2. 데이터 동기화 (익명 사용자 제외)
          if (!session.user.is_anonymous) {
            tasks.push(
              (async () => {
                console.log('🔄 앱 복귀 데이터 동기화 중...');
                const { masterDataManager } = await import('./src/store/masterDataManager');
                const success = await masterDataManager.syncAllData();
                if (success) {
                  console.log('✅ 앱 복귀 동기화 완료');
                  // 프로필 상태도 새로고침
                  fetchProfile();
                } else {
                  console.log('⚠️ 앱 복귀 동기화 일부 실패');
                }
              })()
            );
          }
          
          // ⚡ 모든 작업을 병렬로 실행 (최대 속도)
          await Promise.all(tasks);
          console.log('🎯 앱 복귀 병렬 동기화 완료 - 총 처리 시간 단축!');
        } catch (error) {
          console.error('❌ 앱 복귀 동기화 실패:', error);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [session, fetchProfile]);

  // 스플래시 스크린 비활성화됨

  // 로딩 화면 (첫 실행 확인 포함)
  if (loading || !fontsLoaded || isFirstLaunch === null) {
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
          {!fontsLoaded ? '폰트 로딩 중...' : supabaseStatus.isConnected ? '동기화 중...' : '서버 연결 중...'}
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
        {/* 🔄 자동 재시도 버튼 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#10b981',
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 8,
            minWidth: 200,
            marginBottom: 12
          }}
          onPress={async () => {
            console.log('🔄 자동 재시도 시작...');
            setLoading(true);
            setInitError('');
            
            // 🚨 ProfileSetupScreen 이동 방지: session/profile 초기화
            setSession(null); // 완전 초기화 - AuthStack으로 이동
            
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
              try {
                console.log(`🔄 재시도 ${retryCount + 1}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, 500)); // ⚡ 0.5초 대기 (고속)
                
                // Supabase 연결 테스트
                const { data } = await supabase.from('profiles').select('count').limit(1);
                console.log('✅ Supabase 연결 성공!');
                
                setLoading(false);
                return; // 성공 시 종료
              } catch (error) {
                retryCount++;
                console.log(`❌ 재시도 ${retryCount} 실패:`, error);
                
                if (retryCount >= maxRetries) {
                  setLoading(false);
                  setInitError('서버 연결에 계속 실패합니다. 네트워크 상태를 확인하거나 앱을 종료해주세요.');
                }
              }
            }
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
            🔄 자동 재시도 (3회)
          </Text>
        </TouchableOpacity>
        
        {/* 🚪 앱 종료 버튼 */}
        <TouchableOpacity
          style={{
            backgroundColor: '#ef4444',
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 8,
            minWidth: 200
          }}
          onPress={() => {
            Alert.alert(
              '앱 종료',
              '정말로 앱을 종료하시겠습니까?',
              [
                { text: '취소', style: 'cancel' },
                {
                  text: '종료',
                  style: 'destructive',
                  onPress: () => {
                    console.log('🚪 사용자가 앱 종료를 선택했습니다.');
                    if (typeof window !== 'undefined' && window.close) {
                      window.close();
                    }
                  }
                }
              ]
            );
          }}
        >
          <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
            🚪 앱 종료
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
      userId: session?.user?.id?.slice(0, 8) || 'N/A',
      isFirstLaunch
    });
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="auto" />
        
        {!session ? (
          <AuthStack />
        ) : !profile ? (
          <ProfileSetupScreen />
        ) : (
          <MainTab />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
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
