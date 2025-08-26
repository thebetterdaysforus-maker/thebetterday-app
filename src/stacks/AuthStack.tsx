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
        options={{ title: '프로필 설정', headerBackVisible: false }} 
      />
    </Stack.Navigator>
  );
}