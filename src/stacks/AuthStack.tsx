import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import WelcomeScreen from '../screens/WelcomeScreen';
import GuestModeScreen from '../screens/GuestModeScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import TutorialScreen from '../screens/TutorialScreen';
import useUserStore from '../store/userStore';
import useProfileStore from '../store/profileStore';

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  const { session } = useUserStore();
  const { profile } = useProfileStore();
  
  // 라우팅 결정 로직 - tutorialCompleted 상태 관리는 App.tsx에서만 수행
  let initialRouteName = 'Welcome';
  
  if (session && !profile) {
    // 세션이 있지만 프로필이 없는 경우 - ProfileSetup으로
    initialRouteName = 'ProfileSetup';
  } else if (session && profile) {
    // 세션과 프로필이 모두 있는 경우 - Tutorial로 (App.tsx에서 tutorialCompleted 확인)
    initialRouteName = 'Tutorial';
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
      <Stack.Screen 
        name="Tutorial" 
        component={TutorialScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}