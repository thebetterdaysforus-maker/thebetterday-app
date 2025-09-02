import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import CommunityScreen from '../screens/CommunityScreen';

export type CommunityStackParamList = {
  CommunityMain: undefined;
};

const Stack = createNativeStackNavigator<CommunityStackParamList>();

export default function CommunityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityMain" component={CommunityScreen} />
    </Stack.Navigator>
  );
}