import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import WelcomeScreen from '../screens/WelcomeScreen';
import GuestModeScreen from '../screens/GuestModeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

import useUserStore from '../store/userStore';
import useProfileStore from '../store/profileStore';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const { session } = useUserStore();
  const { profile } = useProfileStore();
  
  // 세션 만료된 기존 사용자 체크 및 재시작 안내
  useEffect(() => {
    // profile은 있지만 session이 없는 경우 = 세션 만료된 기존 사용자
    if (profile && !session) {
      console.log('🚨 세션 만료된 기존 사용자 감지:', {
        profile: '있음',
        session: '없음',
        action: '재시작 안내 표시'
      });
      
      Alert.alert(
        "세션 만료",
        "로그인 세션이 만료되었습니다.\n기존 데이터를 보호하기 위해 앱을 재시작해주세요.",
        [
          {
            text: "확인",
            onPress: () => {
              console.log('💥 사용자 요청으로 앱 강제 종료');
              BackHandler.exitApp();
            }
          }
        ],
        { cancelable: false }
      );
    }
  }, [profile, session]);
  
  // 라우팅 결정 로직 - 항상 Welcome 화면부터 시작
  const initialRouteName = 'Welcome';
  
  console.log('🔍 AuthStack 라우팅 결정:', {
    session: session ? '있음' : '없음',
    profile: profile ? '있음' : '없음',
    initialRouteName,
    isAnonymous: session?.user?.is_anonymous || false,
    note: '첫 실행 또는 세션 없음으로 Welcome 화면 표시'
  });

  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="GuestMode" 
        component={GuestModeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ProfileSetup" 
        component={ProfileSetupScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}