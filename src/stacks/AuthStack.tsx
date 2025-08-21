import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import WelcomeScreen from '../screens/WelcomeScreen';
import GuestModeScreen from '../screens/GuestModeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';

import useUserStore from '../store/userStore';
import useProfileStore from '../store/profileStore';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const { session } = useUserStore();
  const { profile } = useProfileStore();
  
  // 라우팅 결정 로직 수정 - Welcome 화면을 우선으로
  let initialRouteName = 'Welcome';
  
  // 모든 세션에 대해 프로필 존재 여부 확인
  if (session && !profile) {
    // 세션이 있지만 프로필이 없는 경우 - ProfileSetup으로
    initialRouteName = 'ProfileSetup';
  }
  
  console.log('🔍 AuthStack 라우팅 결정:', {
    session: session ? '있음' : '없음',
    profile: profile ? '있음' : '없음',
    initialRouteName,
    isAnonymous: session?.user?.is_anonymous || false
  });

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
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
        options={{ title: '프로필 설정', headerBackVisible: false }} 
      />
    </Stack.Navigator>
  );
}
