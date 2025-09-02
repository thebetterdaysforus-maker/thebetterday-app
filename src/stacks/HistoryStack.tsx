import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import DayDetailScreen from '../screens/DayDetailScreen';
import HistoryCalendarScreen from '../screens/HistoryCalendarScreen';
import RetrospectScreen from '../screens/RetrospectScreen';
import PersonalAnalyticsScreen from '../screens/PersonalAnalyticsScreen';

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator
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
        name="HistoryCalendar" 
        component={HistoryCalendarScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DayDetail" 
        component={DayDetailScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Retrospect" 
        component={RetrospectScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Statistics" 
        component={PersonalAnalyticsScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}