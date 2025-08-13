import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import DayDetailScreen from '../screens/DayDetailScreen';
import HistoryCalendarScreen from '../screens/HistoryCalendarScreen';
import RetrospectScreen from '../screens/RetrospectScreen';
import PersonalAnalyticsScreen from '../screens/PersonalAnalyticsScreen';

const Stack = createNativeStackNavigator();

export default function HistoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HistoryCalendar" 
        component={HistoryCalendarScreen}
        options={{ title: '기록 달력' }}
      />
      <Stack.Screen 
        name="DayDetail" 
        component={DayDetailScreen}
        options={{ title: '일별 상세' }}
      />
      <Stack.Screen 
        name="Retrospect" 
        component={RetrospectScreen}
        options={{ title: '회고 작성' }}
      />
      <Stack.Screen 
        name="Statistics" 
        component={PersonalAnalyticsScreen}
        options={{ title: '성장 분석' }}
      />
    </Stack.Navigator>
  );
}