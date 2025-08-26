import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text, View } from 'react-native';
import HistoryStack from './HistoryStack';
import HomeStack from './HomeStack';
import CommunityStack from './CommunityStack';

import SettingsStack from './SettingsStack';

// 타입 정의
export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Network: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/* 더미 화면 재사용 */
const Dummy = ({ route }: { route: any }) => (
  <View style={{flex:1,justifyContent:'center',alignItems:'center'}}>
    <Text>{route.name} 화면 (준비 중)</Text>
  </View>
);

export default function MainTab() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'History':
              iconName = 'calendar';
              break;
            case 'Network':
              iconName = 'people';
              break;
            case 'Settings':
              iconName = 'settings';
              break;
            default:
              iconName = 'help-circle';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack} 
        options={{ tabBarLabel: '홈' }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryStack} 
        options={{ tabBarLabel: 'DB' }}
      />
      <Tab.Screen 
        name="Network" 
        component={CommunityStack} 
        options={{ tabBarLabel: '커뮤니티' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsStack} 
        options={{ tabBarLabel: '설정' }}
      />
    </Tab.Navigator>
  );
}